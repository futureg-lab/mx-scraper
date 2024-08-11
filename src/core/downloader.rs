use std::{io::Write, path::Path, str::FromStr, sync::Arc};

use anyhow::Context;
use chrono::Local;
use futures::future::join_all;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use lazy_static::lazy_static;
use tokio::task;
use url::Url;

use crate::{
    plugins::FetchResult,
    schemas::book::{Book, CacheFile, Page},
};

use super::{
    http::{self},
    utils,
};

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

pub async fn batch_download(
    fetched_book: &[FetchResult],
    batch_size: usize,
) -> Vec<DownloadStatus> {
    let mut status = vec![];
    let batches = utils::batch_a_list_of(fetched_book, batch_size);
    for (p, batch) in batches.iter().enumerate() {
        println!("Batch {}/{}", p + 1, batches.len());
        let local_status = download(&batch).await;
        status.extend(local_status);
    }
    status
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

    let folders = book.get_download_folders(&plugin_name);
    let metadata_file = book.get_metadata_path(&plugin_name);
    create_metadata_file(&metadata_file, &book)?;

    for (c, chapter) in book.chapters.iter().enumerate() {
        pb.set_message(format!(
            "[ch. {}/{}] :: {} :: {}",
            c + 1,
            book.chapters.len(),
            book.title,
            plugin_name
        ));

        for page in &chapter.pages {
            let down_dir = folders
                .download
                .join(utils::sanitize_string_as_path(&chapter.title));
            let temp_dir = folders
                .temp
                .join(utils::sanitize_string_as_path(&chapter.title));
            download_page(page, &temp_dir, &down_dir).await?;
            pb.inc(1);
        }
    }

    // move book
    if !folders.download.exists() {
        std::fs::create_dir_all(&folders.download.parent().unwrap())?;
        if folders.temp.exists() {
            std::fs::rename(&folders.temp, &folders.download).with_context(|| {
                format!(
                    "Moving {:?} ==> {:?}",
                    folders.temp.display(),
                    folders.download.display()
                )
            })?;
        }
    }

    Ok(())
}

async fn download_page(page: &Page, tmp_dir: &Path, down_dir: &Path) -> anyhow::Result<()> {
    // let filename = utils::sanitize_string_as_path(&page.filename);
    let filename = &page.filename;
    let tmp_filepath = tmp_dir.join(&filename);
    let down_filepath = down_dir.join(&filename);

    if tmp_filepath.exists() || down_filepath.exists() {
        return Ok(());
    }

    let url = Url::from_str(&page.url)?;
    let bytes = http::fetch(url)?;

    std::fs::create_dir_all(&tmp_dir).with_context(|| format!("Creating {}", tmp_dir.display()))?;

    let mut file = std::fs::File::create(&tmp_filepath)
        .with_context(|| format!("Creating {}", tmp_filepath.display()))?;
    file.write(&bytes).with_context(|| "Downloading {url}")?;
    Ok(())
}

fn create_metadata_file(file: &Path, book: &Book) -> anyhow::Result<()> {
    let version = env!("CARGO_PKG_VERSION").to_owned();
    let time = Local::now().to_string();

    let cache_file = CacheFile {
        engine: format!("mx-scraper {version}"),
        date: time,
        book: book.clone(),
    };

    let parent = file.parent().unwrap();
    if !parent.exists() {
        std::fs::create_dir_all(parent)?;
    }

    let text = serde_json::to_string_pretty(&cache_file).unwrap();
    std::fs::write(&file, text)?;
    Ok(())
}
