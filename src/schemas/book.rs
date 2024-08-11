use std::{collections::HashMap, path::PathBuf};

use anyhow::Context;
use serde::{Deserialize, Serialize};
use url::Url;

use crate::{core::utils, GLOBAL_CONFIG};

use super::config::DownloadFolder;

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub title: String,
    pub title_aliases: Vec<TitleAlias>,
    pub source_id: String,
    pub description: String,
    pub authors: Vec<Author>,
    pub chapters: Vec<Chapter>,
    pub tags: Vec<Tag>,
    pub metadatas: Vec<Metadata>,
    pub url: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub title: String,
    pub description: String,
    pub url: String,
    pub number: u32,
    pub pages: Vec<Page>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseLinkHint {
    pub selector: String,
    pub attribute: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Page {
    pub title: String,
    pub url: String,
    pub intermediate_link_hint: Option<ParseLinkHint>,
    pub number: u32,
    pub filename: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    pub metadatas: Vec<Metadata>,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct TitleAlias {
    pub title: String,
    pub description: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    pub label: String,
    pub content: serde_json::Value,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Author {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Clone, Deserialize)]
pub struct DownloadBookMeta {
    pub engine: String,
    pub date: String, // Consider using a more appropriate date type, like chrono::NaiveDate
    pub book: Book,
}

#[derive(Debug, Serialize, Clone, Deserialize)]
pub struct PluginOption {
    pub use_proxy: bool,
    pub proxy_url: Option<String>,
    pub proxy_port: Option<u16>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchOption {
    pub additional_options: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Clone, Deserialize, Debug)]
pub struct RawUrls {
    pub title: String,
    pub url_source: String,
    pub urls: Vec<String>,
    pub tags: Vec<String>,
}

#[derive(Serialize, Clone, Deserialize, Debug)]
pub struct CacheFile {
    pub engine: String,
    pub date: String,
    pub book: Book,
}

impl Chapter {
    pub fn from_raw_urls(raw: RawUrls) -> anyhow::Result<Chapter> {
        let RawUrls {
            urls,
            url_source: _,
            title,
            tags: _,
        } = raw;
        let chapter = Chapter {
            title: title.clone(),
            pages: urls
                .iter()
                .enumerate()
                .map(|(p, url)| {
                    let url =
                        Url::parse(url).with_context(|| format!("Failed Parsing: {url:?}"))?;
                    let filename = utils::extract_filename(&url)
                        .unwrap_or_else(|| format!("{}_{}", title.clone(), p + 1));
                    Ok(Page {
                        filename,
                        title: format!("{} page #{}", title.clone(), p + 1),
                        number: p as u32 + 1,
                        url: url.to_string(),
                        ..Default::default()
                    })
                })
                .collect::<anyhow::Result<Vec<Page>>>()?,
            ..Default::default()
        };
        Ok(chapter)
    }
}

impl Book {
    pub fn from_raw_urls(raw: RawUrls) -> anyhow::Result<Book> {
        let RawUrls {
            urls: _,
            url_source,
            title,
            tags,
        } = raw.clone();
        let mut book = Book {
            ..Default::default()
        };
        book.title = title.clone();
        book.source_id = title.clone();
        book.url = url_source;
        book.chapters.push(Chapter::from_raw_urls(raw)?);
        book.tags = tags
            .iter()
            .map(|tag| Tag {
                name: tag.to_owned(),
                metadatas: vec![],
            })
            .collect();

        Ok(book)
    }

    pub fn get_sanitized_title(&self) -> String {
        utils::sanitize_string(&self.title)
    }

    pub fn get_download_folders(&self, plugin_name: &str) -> DownloadFolder {
        let (download, temp) = {
            let config = GLOBAL_CONFIG.lock().unwrap();
            (
                config.download_folder.download.clone(),
                config.download_folder.temp.clone(),
            )
        };

        DownloadFolder {
            download: download.join(plugin_name).join(self.get_sanitized_title()),
            temp: temp.join(plugin_name).join(self.get_sanitized_title()),
        }
    }

    pub fn get_metadata_path(&self, plugin_name: &str) -> PathBuf {
        let temp = {
            let config = GLOBAL_CONFIG.lock().unwrap();
            config.download_folder.temp.clone()
        };

        temp.join(plugin_name)
            .join(self.get_sanitized_title())
            .join(format!("{}.json", utils::sanitize_string(&self.source_id)))
    }
}
