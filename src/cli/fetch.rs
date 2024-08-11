use std::{path::PathBuf, str::FromStr};

use clap::{Args, Parser};
use indexmap::{IndexMap, IndexSet};
use url::Url;

use crate::{
    core::{
        downloader::{download, DownloadStatus},
        http,
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
    /// Verbose mode
    #[arg(required = false, long, short)]
    pub verbose: bool,
    /// Disable cache
    #[arg(long, short)]
    pub no_cache: Option<bool>,
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
        {
            let mut config = GLOBAL_CONFIG.lock().unwrap();
            config.adapt_override(self.flags.clone())?;
        }

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

        if !self.flags.meta_only {
            let status: Vec<DownloadStatus> = download(&fetched_books).await;
            display_download_status(&fetched_books, &status);
        }

        Ok(())
    }
}

impl FileSequence {
    pub async fn fetch(&self, manager: &mut PluginManager) -> anyhow::Result<()> {
        {
            let mut config = GLOBAL_CONFIG.lock().unwrap();
            config.adapt_override(self.flags.clone())?;
        }

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

        if !self.flags.meta_only {
            let status = download(&fetched_books).await;
            display_download_status(&fetched_books, &status);
        }
        Ok(())
    }
}

impl UrlTerm {
    pub fn fetch(&self) -> anyhow::Result<()> {
        {
            let mut config = GLOBAL_CONFIG.lock().unwrap();
            config.adapt_override(self.flags.clone())?;
        }
        // TODO: add --text (default), --download flags
        let url = Url::from_str(&self.url)?;

        let text = std::thread::spawn(move || {
            http::fetch(url).and_then(|response| response.text().map_err(|e| e.into()))
        })
        .join()
        .unwrap()
        .map_err(|e| anyhow::anyhow!("{e}"))?;

        println!("{text}");
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
    println!(
        "Found {} entr{}..",
        terms.len(),
        if terms.len() == 1 { "y" } else { "ies" }
    );
    let mut results = IndexMap::new();
    for term in terms {
        // TODO: parallel fetch (actual scraping), +abuse disclaimer
        let res = match plugin {
            Some(ref name) => manager.fetch(term.to_owned(), name.to_owned()).await,
            None => manager.auto_fetch(term.to_owned()).await,
        };
        results.insert(
            term.clone(),
            match res {
                Ok(fetched) => Resolution::Success(fetched),
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
