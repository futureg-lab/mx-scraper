use std::{path::Path, sync::Arc, time::Duration};

use futures::future::join_all;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use lazy_static::lazy_static;
use std::path::PathBuf;
use tokio::{task, time::sleep};

use crate::{plugins::FetchResult, schemas::book::Page};

lazy_static! {
    static ref MULTI_PROGRESS: Arc<MultiProgress> = Arc::new(MultiProgress::new());
}

#[derive(Debug)]
pub enum Failure {
    Panic,
    Cancelled,
    Unknown,
    Some(anyhow::Error),
}

pub enum DownloadStatus {
    Success,
    Fail(Failure),
}

pub async fn download(fetched_book: &[FetchResult]) -> Vec<DownloadStatus> {
    let handles = fetched_book
        .into_iter()
        .map(|f| task::spawn(download_book(f.clone())));

    join_all(handles)
        .await
        .iter()
        .map(|task| match task {
            Ok(result) => match result {
                Ok(()) => DownloadStatus::Success,
                Err(e) => {
                    let error = anyhow::anyhow!(format!(": {e}"));
                    DownloadStatus::Fail(Failure::Some(error))
                }
            },
            Err(e) => {
                if e.is_cancelled() {
                    DownloadStatus::Fail(Failure::Cancelled)
                } else if e.is_panic() {
                    DownloadStatus::Fail(Failure::Panic)
                } else {
                    // unreachable!() ?
                    DownloadStatus::Fail(Failure::Unknown)
                }
            }
        })
        .collect()
}

pub async fn download_book(fetch_result: FetchResult) -> anyhow::Result<()> {
    let FetchResult { book, plugin_name } = fetch_result;
    let total_pages = book
        .chapters
        .iter()
        .fold(0, |acc, chaoter| acc + chaoter.pages.len());

    let pb = MULTI_PROGRESS.add(ProgressBar::new(total_pages as u64));
    pb.set_style(
        ProgressStyle::default_bar()
            .template("[{elapsed_precise}] [{bar:40.green}] {pos:>7}/{len:7} {eta} | {msg}")
            .unwrap()
            .progress_chars("=>-"),
    );

    for (c, chapter) in book.chapters.iter().enumerate() {
        pb.set_message(format!(
            "[ch. {}/{}] :: {} :: {}",
            c + 1,
            book.chapters.len(),
            book.title,
            plugin_name
        ));

        for page in &chapter.pages {
            download_page(page, &PathBuf::from(".")).await?;
            pb.inc(1);
        }
    }

    Ok(())
}

async fn download_page(_page: &Page, _base_dir: &Path) -> anyhow::Result<()> {
    sleep(Duration::from_millis(60)).await;

    Ok(())
}
