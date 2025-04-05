use std::{collections::HashMap, path::PathBuf};

use anyhow::Context;
use async_graphql::SimpleObject;
use serde::{Deserialize, Serialize};
use url::Url;

use crate::core::http::FetchContext;
use crate::{core::utils, GLOBAL_CONFIG};

use super::config::DownloadFolder;
use super::default_on_null;

#[derive(Default, Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Book {
    pub title: String,
    pub title_aliases: Vec<TitleAlias>,
    pub source_id: String,
    pub description: String,
    pub authors: Vec<Author>,
    pub chapters: Vec<Chapter>,
    pub tags: Vec<Tag>,
    // Account for typo
    #[serde(alias = "metadata", alias = "metadatas")]
    pub metadata: Vec<Metadata>,
    pub url: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Chapter {
    pub title: String,
    pub description: String,
    pub url: String,
    pub number: u32,
    pub pages: Vec<Page>,
    #[serde(default, deserialize_with = "default_on_null")]
    pub metadata: Vec<Metadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ParseLinkHint {
    pub selector: String,
    pub attribute: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Page {
    pub title: String,
    pub url: String,
    pub intermediate_link_hint: Option<ParseLinkHint>,
    #[graphql(skip)]
    pub fetch_context: Option<FetchContext>,
    pub number: u32,
    pub filename: String,
    #[serde(default, deserialize_with = "default_on_null")]
    pub metadata: Vec<Metadata>,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Tag {
    pub name: String,
    // Account for typo
    #[serde(alias = "metadata", alias = "metadatas")]
    pub metadata: Vec<Metadata>,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct TitleAlias {
    pub title: String,
    pub description: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Metadata {
    pub label: String,
    pub content: serde_json::Value,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Author {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Clone, Deserialize, SimpleObject)]
pub struct DownloadBookMeta {
    pub engine: String,
    pub date: String, // Consider using a more appropriate date type, like chrono::NaiveDate
    pub book: Book,
}

#[derive(Debug, Serialize, Clone, Deserialize, SimpleObject)]
pub struct PluginOption {
    pub use_proxy: bool,
    pub proxy_url: Option<String>,
    pub proxy_port: Option<u16>,
}

#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct SearchOption {
    pub additional_options: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Clone, Deserialize, Debug, SimpleObject)]
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
                metadata: vec![],
            })
            .collect();

        Ok(book)
    }

    pub fn get_sanitized_title(&self) -> String {
        utils::sanitize_string(&self.title)
    }

    pub fn get_download_folders(&self, term: &str, plugin_name: &str) -> DownloadFolder {
        let (download, temp, metadata) = {
            let config = GLOBAL_CONFIG.read().unwrap();
            (
                config.download_folder.download.clone(),
                config.download_folder.temp.clone(),
                config.download_folder.metadata.clone(),
            )
        };
        let id = utils::compute_query_signature(term, plugin_name)[..10].to_string();
        let chunk_title_path =
            utils::sanitize_string_as_path(&self.get_sanitized_title(), Some(id));

        DownloadFolder {
            download: download.join(plugin_name).join(&chunk_title_path),
            temp: temp.join(plugin_name).join(&chunk_title_path),
            metadata: metadata.join(plugin_name),
        }
    }

    /// Metadata temporary path
    pub fn get_metadata_path(&self, term: &str, plugin_name: &str) -> PathBuf {
        let temp = {
            let config = GLOBAL_CONFIG.read().unwrap();
            config.download_folder.temp.clone()
        };

        let id = utils::compute_query_signature(term, plugin_name)[..10].to_string();
        let chunk_title_path =
            utils::sanitize_string_as_path(&self.get_sanitized_title(), Some(id));

        temp.join(plugin_name)
            .join(chunk_title_path)
            .join(format!("{}.json", utils::sanitize_string(&self.source_id)))
    }

    /// Metadata download path
    pub fn get_metadata_dest_path(&self, term: &str, plugin_name: &str) -> PathBuf {
        let metadata = {
            let config = GLOBAL_CONFIG.read().unwrap();
            config.download_folder.metadata.clone()
        };

        let id = utils::compute_query_signature(term, plugin_name)[..10].to_string();
        let chunk_title_path =
            utils::sanitize_string_as_path(&self.get_sanitized_title(), Some(id));

        metadata
            .join(plugin_name)
            .join(chunk_title_path)
            .join(format!("{}.json", utils::sanitize_string(&self.source_id)))
    }

    pub fn resume(&self) -> String {
        format!(
            r#"
- Title: {}
- Source: {}
- Author(s): {}
- Tag(s): {}
- Chapter(s) ({}):
{}
    "#,
            self.title,
            self.url,
            self.authors
                .iter()
                .map(|t| t.name.clone())
                .collect::<Vec<_>>()
                .join(", "),
            self.tags
                .iter()
                .map(|t| t.name.clone())
                .collect::<Vec<_>>()
                .join(", "),
            self.chapters.len(),
            self.chapters
                .iter()
                .map(|chapter| format!("   - {} ({} pages)", chapter.title, chapter.pages.len()))
                .collect::<Vec<_>>()
                .join("\n")
        )
        .trim()
        .to_string()
    }
}
