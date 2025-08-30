use anyhow::Context;
use async_graphql::InputObject;
use clap::{Args, Parser};
use indexmap::{IndexMap, IndexSet};
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use rand::{seq::SliceRandom, thread_rng};
use std::{io::Write, path::PathBuf, str::FromStr};
use url::Url;

use crate::{
    cli::server::OneshotHttpListener,
    core::{
        downloader::{batch_download, DownloadStatus},
        http::{self, ContextProvider, FetchContext},
        utils,
    },
    plugins::FetchResult,
    schemas::config,
    GLOBAL_CONFIG, PLUGIN_MANAGER,
};

#[derive(Args, Clone, Debug, InputObject)]
pub struct Auth {
    /// Username (Basic)
    #[arg(long)]
    user: Option<String>,
    /// Password (Basic)
    #[arg(long)]
    password: Option<String>,
    /// Bearer string
    #[arg(long)]
    bearer: Option<String>,
}

#[derive(Args, Clone, Debug)]
pub struct SharedFetchOption {
    /// Only fetch metadata
    #[arg(required = false, long, short)]
    pub meta_only: bool,
    /// Override the download batch amount
    #[arg(long)]
    pub batch_size: Option<usize>,
    /// Override the download mini batch amount
    #[arg(long)]
    pub mini_batch_size: Option<usize>,
    /// Override the number of terms to process at init (metadata retrieval)
    #[arg(long)]
    pub max_size_init_crawl_batch: Option<usize>,
    /// Override the number of parallel request at a time
    #[arg(long)]
    pub max_parallel_fetch: Option<usize>,
    /// Verbose mode
    #[arg(required = false, long, short)]
    pub verbose: bool,
    /// Override cache status
    #[arg(required = false, long, short)]
    pub no_cache: bool,
    /// Shuffle terms
    #[arg(required = false, long, short)]
    pub rand: bool,
    /// Sort terms by page count in ascending order
    #[arg(required = false, long, short)]
    pub asc: bool,
    /// Print back terms, can be affected by --asc, --rand or --verbose
    #[arg(required = false, long)]
    pub reflect: bool,
    /// Force use a plugin and bypass term pattern checks
    #[arg(long, short)]
    pub plugin: Option<String>,
    /// Load cookies from a file
    #[arg(long, short)]
    pub cookies: Option<PathBuf>,
    /// Use the downloader associated with the plugin
    #[arg(long, short = 'd')]
    pub custom_downloader: bool,
    #[command(flatten)]
    pub auth: Option<Auth>,
    /// Wait for cookies sent from a callback
    #[arg(long, short = 'l')]
    pub listen_cookies: bool,
}

#[derive(Parser, Debug)]
pub struct TermSequence {
    /// A sequence of terms
    #[arg(required = true)]
    pub terms: Vec<String>,
    #[command(flatten)]
    pub flags: SharedFetchOption,
}

#[derive(Parser, Debug)]
pub struct UrlTerm {
    /// Request url
    pub url: String,
    /// Print as text to stdout
    #[arg(required = false, long, short = 't')]
    pub print: bool,
    /// File destination
    #[arg(required = false, long)]
    pub dest: Option<PathBuf>,
    #[command(flatten)]
    pub flags: SharedFetchOption,
}

#[derive(Parser, Debug)]
pub struct FileSequence {
    /// A sequence of files
    #[arg(required = true)]
    pub files: Vec<PathBuf>,
    #[command(flatten)]
    pub flags: SharedFetchOption,
}

pub enum Resolution {
    Success(FetchResult),
    Fail(anyhow::Error),
}

impl TermSequence {
    pub async fn fetch(&self) -> anyhow::Result<()> {
        {
            if let Some(max_fetch) = self.flags.max_parallel_fetch {
                http::update_fetch_semaphore_count(max_fetch).await;
            }
        }

        {
            if self.flags.listen_cookies {
                let listener = OneshotHttpListener { port: 5678 };
                let context = listener.block_and_listen::<FetchContext>("context").await?;
                let mut config = GLOBAL_CONFIG.write().unwrap();
                tracing::debug!("New fetch context will be injected: {context:?}");
                config.__known_fetch_context = Some(context);
            }
        }

        let batch_size = {
            let mut config = GLOBAL_CONFIG.write().unwrap();
            config.adapt_override(self.flags.clone())?;
            config.max_size_batch
        };

        let terms = {
            let mut terms = self.terms.clone();
            shuffle_in_place(&mut terms, self.flags.rand);
            terms
        };

        let results = {
            match self.flags.plugin.clone() {
                Some(name) => fetch_terms(terms, Some(name)).await,
                None => fetch_terms(terms, None).await,
            }
        }?;

        let mut fetched_books = results
            .iter()
            .filter_map(|(_, res)| match res {
                Resolution::Success(f) => Some(f.clone()),
                Resolution::Fail(_) => None,
            })
            .collect::<Vec<_>>();

        sort_in_place(&mut fetched_books, self.flags.asc);

        if self.flags.meta_only && self.flags.verbose {
            display_main_metadata_attributes(&fetched_books);
        }

        display_fetch_status(&results, self.flags.verbose);

        if self.flags.reflect {
            reflect_back_terms(&fetched_books, self.flags.verbose);
        } else {
            let status: Vec<DownloadStatus> = batch_download(&fetched_books, batch_size).await;
            display_download_status(&fetched_books, &status);
        }

        Ok(())
    }
}

impl FileSequence {
    pub async fn fetch(&self) -> anyhow::Result<()> {
        {
            if let Some(max_fetch) = self.flags.max_parallel_fetch {
                http::update_fetch_semaphore_count(max_fetch).await;
            }
        }

        {
            if self.flags.listen_cookies {
                let listener = OneshotHttpListener { port: 5678 };
                let context = listener.block_and_listen::<FetchContext>("context").await?;
                let mut config = GLOBAL_CONFIG.write().unwrap();
                tracing::debug!("New fetch context will be injected: {context:?}");
                config.__known_fetch_context = Some(context);
            }
        }

        let batch_size = {
            let mut config = GLOBAL_CONFIG.write().unwrap();
            config.adapt_override(self.flags.clone())?;
            config.max_size_batch
        };

        let mut file_issues = IndexMap::new();
        let mut terms = vec![];

        for file in &self.files {
            match std::fs::read_to_string(file) {
                Ok(content) => {
                    for line in content.lines() {
                        if !line.trim().starts_with('#') {
                            terms.extend(line.split_whitespace().map(|s| s.to_owned()));
                        }
                    }
                }
                Err(e) => {
                    file_issues.insert(format!("File at {file:?}"), Resolution::Fail(e.into()));
                }
            }
        }

        let terms = {
            shuffle_in_place(&mut terms, self.flags.rand);
            terms
        };

        let results = {
            let manager = PLUGIN_MANAGER.read().await;
            let mut results = match self.flags.plugin.clone() {
                Some(name) => {
                    manager.assert_exists(name.clone())?;
                    fetch_terms(terms, Some(name)).await
                }
                None => fetch_terms(terms, None).await,
            }?;

            results.extend(file_issues); // merge!
            results
        };

        display_fetch_status(&results, self.flags.verbose);

        let mut fetched_books = results
            .iter()
            .filter_map(|(_, res)| match res {
                Resolution::Success(f) => Some(f.clone()),
                Resolution::Fail(_) => None,
            })
            .collect::<Vec<_>>();

        sort_in_place(&mut fetched_books, self.flags.asc);

        if self.flags.meta_only && self.flags.verbose {
            display_main_metadata_attributes(&fetched_books);
        }

        if self.flags.reflect {
            reflect_back_terms(&fetched_books, self.flags.verbose);
        } else {
            let status = batch_download(&fetched_books, batch_size).await;
            display_download_status(&fetched_books, &status);
        }

        Ok(())
    }
}

impl UrlTerm {
    pub async fn fetch(&self) -> anyhow::Result<()> {
        let client = {
            let mut config = GLOBAL_CONFIG.write().unwrap();
            config.adapt_override(self.flags.clone())?;
            config.get_http_client()
        };

        {
            if self.flags.listen_cookies {
                let listener = OneshotHttpListener { port: 5678 };
                let context = listener.block_and_listen::<FetchContext>("context").await?;
                let mut config = GLOBAL_CONFIG.write().unwrap();
                tracing::debug!("New fetch context will be injected: {context:?}");
                config.__known_fetch_context = Some(context);
            }
        }

        let url = Url::from_str(&self.url)?;
        let bytes = client.get_async(url.clone(), ContextProvider::None).await?;
        if self.print || self.dest.is_none() {
            std::io::stdout().write_all(&bytes)?;
        } else {
            let dest = match self.dest.clone() {
                Some(dest) => dest,
                None => {
                    let filename =
                        utils::extract_filename(&url).unwrap_or("download.bin".to_string());
                    PathBuf::from(filename)
                }
            };
            let mut file = std::fs::File::create(&dest)
                .with_context(|| format!("Creating {}", dest.display()))?;
            file.write(&bytes).with_context(|| "Downloading {url}")?;
        }
        Ok(())
    }
}

impl Auth {
    pub fn gen_basic_auth(&self) -> anyhow::Result<config::AuthKind> {
        if self.user.is_some() {
            Ok(config::AuthKind::Basic {
                user: self.user.clone().unwrap(),
                password: self.password.clone(),
            })
        } else if let Some(bearer) = self.bearer.clone() {
            let prefix = "Bearer ";
            Ok(config::AuthKind::Bearer {
                token: match bearer.starts_with(prefix) {
                    true => bearer.strip_prefix(prefix).unwrap_or(&bearer).to_owned(),
                    false => bearer,
                },
            })
        } else {
            anyhow::bail!("At least user must be provided, or use --bearer")
        }
    }
}

pub async fn fetch_terms(
    terms: Vec<String>,
    plugin: Option<String>,
) -> anyhow::Result<IndexMap<String, Resolution>> {
    if let Some(plugin) = &plugin {
        PLUGIN_MANAGER.read().await.assert_exists(plugin.clone())?;
    }
    let crawl_batch = { GLOBAL_CONFIG.read().unwrap().max_size_init_crawl_batch };

    let terms: IndexSet<String> = IndexSet::from_iter(terms.to_owned().into_iter());
    let terms = Vec::from_iter(terms.into_iter());

    let m = MultiProgress::new();
    let spinner = ProgressStyle::with_template("{prefix:.bold.dim} {spinner} {wide_msg}")
        .unwrap()
        .tick_chars("⠁⠂⠄⡀⢀⠠⠐⠈ ");
    let status_pb = m.add(ProgressBar::new(1));
    status_pb.set_style(spinner.clone());
    status_pb.set_prefix(format!(
        "[Found {} entr{}]",
        terms.len(),
        if terms.len() == 1 { "y" } else { "ies" }
    ));
    status_pb.finish_with_message("..");

    let local_pb = m.add(ProgressBar::new(1));
    local_pb.set_style(spinner.clone());

    let mut results = IndexMap::new();
    let mut fetched_count = 0;
    let mut cached_count = 0;

    let batches = utils::batch_a_list_of(&terms, crawl_batch);
    let mut done = 0;
    for batch in batches {
        local_pb.set_prefix(format!("[{}/{}]", done, terms.len()));

        let mut join_set = tokio::task::JoinSet::new();
        for term in batch {
            local_pb.set_message(term.trim().to_string());
            let plugin = plugin.clone();
            join_set.spawn(async move {
                let manager = PLUGIN_MANAGER.read().await;
                (
                    term.clone(),
                    match plugin {
                        Some(ref name) => manager.fetch(term.to_string(), name.to_owned()).await,
                        None => manager.auto_fetch(term.to_string()).await,
                    },
                )
            });
        }

        while let Some(res) = join_set.join_next().await {
            done += 1;
            match res {
                Ok((term, crawl_result)) => {
                    local_pb.set_prefix(format!("[{}/{}]", done, terms.len()));
                    local_pb.set_message(term.trim().to_string());

                    results.insert(
                        term.to_string(),
                        match crawl_result {
                            Ok(fetched) => {
                                if fetched.cached {
                                    local_pb.set_message(format!(
                                        "{} [cached]",
                                        term.to_string().trim()
                                    ));
                                    cached_count += 1;
                                } else {
                                    fetched_count += 1
                                }

                                status_pb.set_message(format!(
                                    "{fetched_count} fetched, {cached_count} cached, {} left",
                                    terms.len() - (fetched_count + cached_count)
                                ));
                                local_pb.inc(1);

                                Resolution::Success(fetched)
                            }
                            Err(e) => Resolution::Fail(e),
                        },
                    );
                }
                Err(join_err) => eprintln!("Task panicked: {join_err:?}"),
            }
        }
    }

    Ok(results)
}

fn display_fetch_status(results: &IndexMap<String, Resolution>, verbose: bool) {
    let fail_messages = results
        .iter()
        .filter_map(|(term, res)| match res {
            Resolution::Success(_) => None,
            Resolution::Fail(e) => Some((term, e)),
        })
        .enumerate()
        .map(|(p, (term, e))| format!("#{}. {:?}\n{:?}", p + 1, term, e))
        .collect::<Vec<_>>();

    if !fail_messages.is_empty() {
        let messages = if verbose {
            format!(":\n{}", fail_messages.join("\n"))
        } else {
            "..".to_string()
        };
        eprintln!(
            "Failed fetching {}/{}{messages}\n",
            fail_messages.len(),
            results.len(),
        );
    }
}

fn display_download_status(fetched_books: &[FetchResult], results: &[DownloadStatus]) {
    assert!(fetched_books.len() == results.len(), "Size preserved");

    let mut fail_messages = vec![];
    for (p, fetched) in fetched_books.iter().enumerate() {
        if let DownloadStatus::Fail(e) = &results[p] {
            fail_messages.push(format!(
                "#{}. Query term {:?}:\n  - {}\n  - {:?}",
                p + 1,
                fetched.query_term,
                fetched.book.title,
                e
            ));
        }
    }

    if !fail_messages.is_empty() {
        eprintln!(
            "Failed downloads {}/{}:\n{}",
            fail_messages.len(),
            fetched_books.len(),
            fail_messages.join("\n\n")
        );
    }
}

fn display_main_metadata_attributes(results: &[FetchResult]) {
    for (p, item) in results.iter().enumerate() {
        println!("\n{}. ==============\n{}", p + 1, item.book.resume());
    }
}

fn shuffle_in_place(terms: &mut Vec<String>, enable: bool) {
    if enable {
        terms.shuffle(&mut thread_rng());
    }
}

fn sort_in_place(results: &mut Vec<FetchResult>, enable: bool) {
    if enable {
        results.sort_by_key(|f| f.count_pages());
    }
}

fn reflect_back_terms(results: &[FetchResult], verbose: bool) {
    for (i, fetch) in results.iter().enumerate() {
        if verbose {
            println!(
                "# {}: Resolver {}, total links {}",
                i + 1,
                fetch.plugin_name,
                fetch.count_pages()
            );
        }
        println!("{}", fetch.query_term);
        if verbose {
            println!();
        }
    }
}
