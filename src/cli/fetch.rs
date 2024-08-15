use std::{io::Write, path::PathBuf, str::FromStr};

use anyhow::Context;
use clap::{Args, Parser};
use indexmap::{IndexMap, IndexSet};
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use url::Url;

use crate::{
    core::{
        downloader::{batch_download, DownloadStatus},
        http, utils,
    },
    plugins::{FetchResult, PluginManager},
    schemas::config,
    GLOBAL_CONFIG,
};

#[derive(Args, Clone, Debug)]
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
    #[arg(long, short)]
    pub batch_size: Option<usize>,
    /// Verbose mode
    #[arg(required = false, long, short)]
    pub verbose: bool,
    /// Override cache status
    #[arg(required = false, long, short)]
    pub no_cache: bool,
    /// Specifically use a plugin and bypass checks
    #[arg(long, short)]
    pub plugin: Option<String>,
    /// Load cookies from a file
    #[arg(long, short)]
    pub cookies: Option<PathBuf>,
    #[command(flatten)]
    pub auth: Option<Auth>,
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
    #[arg(required = false, long, short)]
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

enum Resolution {
    Success(FetchResult),
    Fail(anyhow::Error),
}

impl TermSequence {
    pub async fn fetch(&self, manager: &mut PluginManager) -> anyhow::Result<()> {
        let batch_size = {
            let mut config = GLOBAL_CONFIG.lock().unwrap();
            config.adapt_override(self.flags.clone())?;
            config.max_size_batch.clone()
        };

        let results = match self.flags.plugin.clone() {
            Some(name) => {
                manager.assert_exists(name.clone())?;
                fetch_terms(&self.terms, manager, Some(name)).await
            }
            None => fetch_terms(&self.terms, manager, None).await,
        };
        let fetched_books = results
            .iter()
            .filter_map(|(_, res)| match res {
                Resolution::Success(f) => Some(f.clone()),
                Resolution::Fail(_) => None,
            })
            .collect::<Vec<FetchResult>>();

        display_fetch_status(&results, self.flags.verbose);

        let status: Vec<DownloadStatus> = batch_download(&fetched_books, batch_size).await;
        display_download_status(&fetched_books, &status);

        Ok(())
    }
}

impl FileSequence {
    pub async fn fetch(&self, manager: &mut PluginManager) -> anyhow::Result<()> {
        let batch_size = {
            let mut config = GLOBAL_CONFIG.lock().unwrap();
            config.adapt_override(self.flags.clone())?;
            config.max_size_batch.clone()
        };

        let mut file_issues = IndexMap::new();
        let mut terms = vec![];

        for file in &self.files {
            match std::fs::read_to_string(file) {
                Ok(content) => {
                    terms.extend(content.split_whitespace().map(|s| s.to_owned()));
                }
                Err(e) => {
                    file_issues.insert(format!("File at {file:?}"), Resolution::Fail(e.into()));
                }
            }
        }

        let mut results = match self.flags.plugin.clone() {
            Some(name) => {
                manager.assert_exists(name.clone())?;
                fetch_terms(&terms, manager, Some(name)).await
            }
            None => fetch_terms(&terms, manager, None).await,
        };

        results.extend(file_issues); // merge!

        display_fetch_status(&results, self.flags.verbose);

        let fetched_books = results
            .iter()
            .filter_map(|(_, res)| match res {
                Resolution::Success(f) => Some(f.clone()),
                Resolution::Fail(_) => None,
            })
            .collect::<Vec<_>>();

        let status = batch_download(&fetched_books, batch_size).await;
        display_download_status(&fetched_books, &status);
        Ok(())
    }
}

impl UrlTerm {
    pub async fn fetch(&self) -> anyhow::Result<()> {
        {
            let mut config = GLOBAL_CONFIG.lock().unwrap();
            config.adapt_override(self.flags.clone())?;
        }

        let url = Url::from_str(&self.url)?;
        let bytes = http::fetch_async(url.clone()).await?;
        if self.print || self.dest.is_none() {
            std::io::stdout().write(&bytes)?;
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

async fn fetch_terms(
    terms: &[String],
    manager: &mut PluginManager,
    plugin: Option<String>,
) -> IndexMap<String, Resolution> {
    let terms: IndexSet<&String> = IndexSet::from_iter(terms.iter());

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
    status_pb.finish_with_message("Done");

    let local_pb = m.add(ProgressBar::new(1));
    local_pb.set_style(spinner.clone());

    let mut results = IndexMap::new();
    let mut cached_count = 0;
    for (p, term) in terms.iter().enumerate() {
        local_pb.set_prefix(format!("[{}/{}]", p + 1, terms.len()));
        local_pb.set_message(format!("{}", term.to_string().trim()));

        // TODO: parallel fetch (actual scraping), +abuse disclaimer
        let res = match plugin {
            Some(ref name) => manager.fetch(term.to_string(), name.to_owned()).await,
            None => manager.auto_fetch(term.to_string()).await,
        };
        results.insert(
            term.to_string(),
            match res {
                Ok(fetched) => {
                    cached_count += if fetched.cached {
                        local_pb.set_message(format!("{} [cached]", term.to_string().trim()));
                        1
                    } else {
                        0
                    };
                    status_pb.set_message(format!(
                        "{} fetched, {cached_count} cached",
                        terms.len() - cached_count
                    ));
                    local_pb.inc(1);

                    Resolution::Success(fetched)
                }
                Err(e) => Resolution::Fail(e),
            },
        );
    }

    results
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

    if fail_messages.len() > 0 {
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
            fail_messages.push(format!(" #{}. {:?}:\n{:?}", p + 1, fetched.book.title, e));
        }
    }

    if fail_messages.len() > 0 {
        eprintln!(
            "Failed downloads {}/{}:\n{}",
            fail_messages.len(),
            fetched_books.len(),
            fail_messages.join("\n")
        );
    }
}
