use std::{error::Error, io::Write, path::Path, str::FromStr, sync::Arc, time::Duration};

use anyhow::Context;
use chrono::Local;
use futures::future::join_all;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use lazy_static::lazy_static;
use scraper::{Html, Selector};
use tokio::task;
use url::Url;

use crate::{
    plugins::FetchResult,
    schemas::book::{Book, CacheFile, Page},
    GLOBAL_CONFIG, PLUGIN_MANAGER,
};

use super::{
    http::{self},
    utils,
};

lazy_static! {
    static ref MULTI_PROGRESS: Arc<MultiProgress> = Arc::new(MultiProgress::new());
}

#[derive(Debug)]
#[allow(unused)]
pub enum Failure {
    Cancelled(anyhow::Error),
    Unknown(anyhow::Error),
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
        let local_status = download(current_batch).await;
        status.extend(local_status);
    }
    status
}

pub async fn download(fetched_book: &[FetchResult]) -> Vec<DownloadStatus> {
    let handles = fetched_book
        .iter()
        .map(|f| task::spawn(download_book(f.clone())));

    join_all(handles)
        .await
        .into_iter()
        .map(|task| match task {
            Ok(result) => match result {
                Ok(()) => DownloadStatus::Success,
                Err(e) => {
                    let error = anyhow::anyhow!(format!("{e}"));
                    DownloadStatus::Fail(Failure::Some(error))
                }
            },
            Err(e) => {
                if e.is_cancelled() {
                    e.source();
                    DownloadStatus::Fail(Failure::Cancelled(anyhow::anyhow!(
                        "{e}: {:?}",
                        e.source()
                    )))
                } else if e.is_panic() {
                    std::panic::resume_unwind(e.into_panic());
                } else {
                    // unreachable!() ?
                    DownloadStatus::Fail(Failure::Unknown(anyhow::anyhow!("{e}")))
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
    let (meta_only, delay, verbose, custom_downloader) = {
        let config = GLOBAL_CONFIG.read().unwrap();
        (
            config.plugins.meta_only,
            config.delay.clone(),
            config.verbose,
            config.custom_downloader,
        )
    };

    let folders = book.get_download_folders(&query_term, &plugin_name);

    if meta_only {
        let down_meta_path = book.get_metadata_dest_path(&query_term, &plugin_name);
        create_metadata_file(&down_meta_path, &book)?;
        return Ok(());
    } else {
        let meta_path = book.get_metadata_path(&query_term, &plugin_name);
        create_metadata_file(&meta_path, &book)?;
    }

    let total_pages = book
        .chapters
        .iter()
        .fold(0, |acc, chapter| acc + chapter.pages.len());

    let pb = MULTI_PROGRESS.add(ProgressBar::new(total_pages as u64));
    pb.set_style(
        ProgressStyle::default_bar()
            .template("[{elapsed_precise}] [{bar:40.green}] {pos:>5}/{len:6} {eta} | {msg}")
            .unwrap()
            .progress_chars("#>-"),
    );

    for (c, chapter) in book.chapters.iter().enumerate() {
        if verbose {
            pb.set_message(format!(
                "{} | [ch. {}/{}] :: {} | {}",
                if cached { "cached" } else { &plugin_name },
                c + 1,
                book.chapters.len(),
                utils::resume_text(&query_term, Some(20)),
                utils::resume_text(&book.title, Some(40)),
            ));
        } else {
            pb.set_message(format!(
                "[ch. {}/{}] :: {}",
                c + 1,
                book.chapters.len(),
                utils::resume_text(&query_term, Some(20)),
            ));
        }

        let chunk_title_path = utils::sanitize_string_as_path(&chapter.title, None);
        let down_dir = folders.download.join(&chunk_title_path);
        let temp_dir = folders.temp.join(&chunk_title_path);

        if !temp_dir.exists() {
            std::fs::create_dir_all(&temp_dir)
                .with_context(|| format!("Creating chapter {}", temp_dir.display()))?;
        }

        for page in &chapter.pages {
            download_page(custom_downloader, &plugin_name, page, &temp_dir, &down_dir).await?;
            tokio::time::sleep(Duration::from_millis(delay.download as u64)).await;
            pb.inc(1);
        }
    }

    // move book
    if !folders.download.exists() {
        std::fs::create_dir_all(folders.download.parent().unwrap())?;
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

async fn download_page(
    use_custom_downloader: bool,
    plugin_name: &str,
    original_page: &Page,
    tmp_dir: &Path,
    down_dir: &Path,
) -> anyhow::Result<()> {
    // let filename = utils::sanitize_string_as_path(&page.filename);
    let filename = &original_page.filename;
    let tmp_filepath = tmp_dir.join(filename);
    let down_filepath = down_dir.join(filename);

    if tmp_filepath.exists() || down_filepath.exists() {
        return Ok(());
    }

    let page = evaluate_lazy_ops(original_page.clone()).await?;
    let url = Url::from_str(&page.url)?;

    if use_custom_downloader {
        match PLUGIN_MANAGER
            .read()
            .await
            .download_url(plugin_name, &tmp_filepath, &url)
        {
            None => anyhow::bail!(
                "No custom downloader available for {plugin_name}, please disable it."
            ),
            Some(res) => res?,
        }
    } else {
        let bytes = http::fetch_async(url.clone())
            .await
            .map_err(|e| anyhow::anyhow!("{e}: {original_page:?}"))?;

        let mut file = std::fs::File::create(&tmp_filepath).with_context(|| {
            format!(
                "Creating page ({} KB): {}",
                bytes.len() / 1000,
                tmp_filepath.display()
            )
        })?;
        file.write(&bytes)
            .with_context(|| format!("Downloading page: {url}"))?;
    }
    Ok(())
}

async fn evaluate_lazy_ops(page: Page) -> anyhow::Result<Page> {
    if let Some(hint) = &page.intermediate_link_hint {
        let bytes = http::fetch_async(Url::from_str(&page.url)?).await?;
        let html = String::from_utf8(bytes)?;
        let document = Html::parse_document(&html);
        let selector =
            Selector::parse(&hint.selector).map_err(|e| anyhow::anyhow!("Bad selector: {e}"))?;

        let evaluated_url = match document.select(&selector).next() {
            Some(value) => value.attr(&hint.attribute).with_context(|| {
                format!(
                    "Retrieving attribute {:?} of {:?} using {page:?}",
                    hint.attribute,
                    value.text()
                )
            })?,
            None => anyhow::bail!("Could not find evaluate {:?} at {}", hint, page.url),
        };

        let url = Url::from_str(evaluated_url)?;

        return Ok(Page {
            url: url.to_string(),
            // filename: utils::extract_filename(&url).unwrap_or(page.filename),
            intermediate_link_hint: None,
            ..page
        });
    }

    Ok(page)
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
    std::fs::write(file, text)?;
    Ok(())
}
