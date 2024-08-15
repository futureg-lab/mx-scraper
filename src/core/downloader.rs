use std::{io::Write, path::Path, str::FromStr, sync::Arc, time::Duration};

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
    GLOBAL_CONFIG,
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
    for (p, current_batch) in batches.iter().enumerate() {
        if batches.len() > 1 {
            println!("Batch {}/{}", p + 1, batches.len());
        }
        let local_status = download(&current_batch).await;
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
    let FetchResult {
        query_term,
        book,
        plugin_name,
        cached,
    } = fetch_result;
    let (meta_only, delay) = {
        let config = GLOBAL_CONFIG.lock().unwrap();
        (config.plugins.meta_only.clone(), config.delay.clone())
    };

    let folders = book.get_download_folders(&plugin_name);

    if meta_only {
        let down_meta_path = book.get_metadata_dest_path(&plugin_name);
        create_metadata_file(&down_meta_path, &book)?;
        return Ok(());
    } else {
        let meta_path = book.get_metadata_path(&plugin_name);
        create_metadata_file(&meta_path, &book)?;
    }

    let total_pages = book
        .chapters
        .iter()
        .fold(0, |acc, chaoter| acc + chaoter.pages.len());

    let pb = MULTI_PROGRESS.add(ProgressBar::new(total_pages as u64));
    pb.set_style(
        ProgressStyle::default_bar()
            .template("[{elapsed_precise}] [{bar:40.green}] {pos:>5}/{len:6} {eta} | {msg}")
            .unwrap()
            .progress_chars("#>-"),
    );

    for (c, chapter) in book.chapters.iter().enumerate() {
        pb.set_message(format!(
            "{} | [ch. {}/{}] :: {} | {}",
            if cached { "cached" } else { &plugin_name },
            c + 1,
            book.chapters.len(),
            utils::resume_text(&query_term, Some(10)),
            utils::resume_text(&book.title, Some(50)),
        ));

        for page in &chapter.pages {
            let down_dir = folders
                .download
                .join(utils::sanitize_string_as_path(&chapter.title));
            let temp_dir = folders
                .temp
                .join(utils::sanitize_string_as_path(&chapter.title));
            download_page(page, &temp_dir, &down_dir).await?;
            tokio::time::sleep(Duration::from_millis(delay.download as u64)).await;
            pb.inc(1);
        }
    }

    // move book
    if !folders.download.exists() {
        std::fs::create_dir_all(&folders.download.parent().unwrap())?;
        if folders.temp.exists() {
            let origin = &folders.temp;
            let dest = &folders.download;
            std::fs::rename(origin, dest).with_context(|| {
                format!("Moving {:?} ==> {:?}", origin.display(), dest.display())
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
    let bytes = http::fetch_async(url).await?;

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
