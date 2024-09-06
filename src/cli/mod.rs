use clap::{Parser, Subcommand};
use fetch::{FileSequence, TermSequence, UrlTerm};
use infos::Infos;

pub mod fetch;
pub mod infos;

#[derive(Parser, Debug)]
#[command(author = "futureg-lab", about = "mx-scraper engine")]
pub struct MainCommand {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Fetch a sequence of terms
    Fetch(TermSequence),
    /// Fetch a sequence of terms from a collection of files
    FetchFiles(FileSequence),
    /// Request a url
    Request(UrlTerm),
    /// Display various informations
    Infos(Infos),
}

impl Commands {
    pub async fn run(&self) -> anyhow::Result<()> {
        match self {
            Commands::Fetch(terms) => terms.fetch().await,
            Commands::FetchFiles(files) => files.fetch().await,
            Commands::Request(url_term) => url_term.fetch().await,
            Commands::Infos(infos) => infos.display().await,
        }
    }
}
