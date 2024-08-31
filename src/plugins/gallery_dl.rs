use std::{path::PathBuf, process::Command, str::FromStr};

use crate::{
    core::utils::{self, extract_filename},
    schemas::{
        book::{
            Author, Book, Chapter, Metadata, Page, PluginOption, SearchOption, Tag, TitleAlias,
        },
        default_on_null, deserialize_coerce_num_as_opt_string, deserialize_singleton,
    },
};
use anyhow::{Context, Ok};
use indexmap::IndexSet;
use serde::{Deserialize, Serialize};
use url::Url;

use super::MXPlugin;

#[derive(Debug)]
pub struct GalleryDLPlugin {
    pub name: String,
    pub bin: PathBuf,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Gallery {
    #[serde(default, alias = "manga")]
    title: Option<String>,

    #[serde(default, deserialize_with = "deserialize_singleton")]
    title_aliases: Vec<String>,

    #[serde(
        default,
        alias = "manga_id",
        deserialize_with = "deserialize_coerce_num_as_opt_string"
    )]
    gallery_id: Option<String>,

    #[serde(default, deserialize_with = "default_on_null")]
    user: serde_json::Value,

    #[serde(
        default,
        alias = "artist",
        alias = "authors",
        alias = "author",
        deserialize_with = "deserialize_singleton"
    )]
    artists: Vec<serde_json::Value>,

    #[serde(default, deserialize_with = "default_on_null")]
    group: Vec<String>,

    #[serde(default, deserialize_with = "default_on_null")]
    category: String,

    #[serde(default, deserialize_with = "default_on_null")]
    characters: Vec<String>,

    #[serde(default, deserialize_with = "default_on_null")]
    language: String,

    #[serde(default, deserialize_with = "default_on_null")]
    parody: Vec<String>,

    #[serde(default, deserialize_with = "default_on_null")]
    subcategory: String,

    #[serde(default, deserialize_with = "default_on_null")]
    tags: Vec<String>,

    #[serde(default, deserialize_with = "default_on_null")]
    hashtags: Vec<String>,
}

#[derive(Debug, Serialize, Clone, Deserialize, Default)]
pub struct GalleryPage {
    filename: Option<String>,
    extension: Option<String>,
    #[serde(default)]
    title: String,
    #[serde(default, deserialize_with = "default_on_null")]
    tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FirstGalleryEntry(i32, Gallery);

#[derive(Debug, Serialize, Deserialize)]
pub struct UrlGalleryEntry(i32, String, serde_json::Value);

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GalleryItem {
    TwoElementTuple(FirstGalleryEntry),
    ThreeElementTuple(UrlGalleryEntry),
}

impl GalleryDLPlugin {
    pub fn new() -> Self {
        Self {
            name: String::from("gallery-dl"),
            bin: PathBuf::from("gallery-dl"),
        }
    }
}

impl MXPlugin for GalleryDLPlugin {
    async fn init(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    async fn destroy(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    fn configure(&mut self, _option: PluginOption) -> anyhow::Result<()> {
        Ok(())
    }

    async fn get_book(&self, term: String) -> anyhow::Result<Book> {
        let mut command = Command::new(&self.bin);
        let output = command.arg(&term).arg("--dump-json").output()?;

        if !output.status.success() {
            let lines = &[
                format!("stdout: {}", String::from_utf8_lossy(&output.stdout)),
                format!("stderr: {}", String::from_utf8_lossy(&output.stderr)),
            ];
            anyhow::bail!("{}", lines.join("\n").to_string());
        }

        let items: Vec<GalleryItem> = serde_json::from_slice(&output.stdout)
            .with_context(|| format!("Parse result of '{}'", print_command_invocation(&command)))?;

        generate_book(term, items)
    }

    async fn search(&self, _term: String, _option: SearchOption) -> anyhow::Result<Vec<Book>> {
        unimplemented!()
    }

    async fn is_supported(&self, term: String) -> anyhow::Result<bool> {
        let mut command = Command::new(&self.bin);
        let output = command.arg(&term).arg("--extractor-info").output()?;
        Ok(output.status.success())
    }
}

pub fn generate_book(term: String, items: Vec<GalleryItem>) -> anyhow::Result<Book> {
    let placeholder_title = utils::resume_text(&term, Some(20)).to_string();
    let mut title = placeholder_title.trim().to_owned();
    let mut title_aliases = IndexSet::new();
    let mut gallery_id = title.clone();

    let mut tags: IndexSet<String> = IndexSet::new();
    let mut authors: IndexSet<String> = IndexSet::new();
    let mut metadata: Vec<Metadata> = vec![];

    let mut pages = vec![];
    for (p, item) in items.into_iter().enumerate() {
        match item {
            GalleryItem::TwoElementTuple(FirstGalleryEntry(_len, gl)) => {
                title = gl.title.unwrap_or_else(|| term.clone());
                gallery_id = if gl.gallery_id.is_none() {
                    term.clone()
                } else {
                    gl.gallery_id.unwrap_or_default()
                };

                title_aliases.extend(gl.title_aliases);

                authors.extend(
                    gl.artists
                        .iter()
                        .map(|v| get_if_not_str_rec("name", v))
                        .collect::<anyhow::Result<Vec<_>>>()?,
                );
                authors.extend(gl.group);

                tags.extend(gl.hashtags);
                tags.extend(gl.tags);
                tags.extend(gl.characters);
                tags.extend(gl.parody);
                tags.insert(gl.category);
                tags.insert(gl.language);
            }
            GalleryItem::ThreeElementTuple(UrlGalleryEntry(_len, url, meta)) => {
                assert!(p >= 1, "First image populated");

                let gpage = serde_json::from_value::<GalleryPage>(meta.clone())?;

                let canon_filename = gpage.filename.map(|f| match gpage.extension {
                    None => format!("{f}.jpg"),
                    Some(ext) => format!("{f}.{ext}"),
                });

                let filename = canon_filename.unwrap_or_else(|| {
                    extract_filename(&Url::from_str(&url).unwrap()).unwrap_or_else(|| p.to_string())
                });

                pages.push(Page {
                    title: gpage.title,
                    url,
                    number: p as u32,
                    filename,
                    ..Default::default()
                });

                tags.extend(gpage.tags);

                metadata.push(Metadata {
                    label: format!("Page {p}"),
                    content: meta,
                });
            }
        }
    }

    let book = Book {
        title: title.clone(),
        url: term.clone(),
        title_aliases: title_aliases
            .into_iter()
            .map(|title| TitleAlias {
                title,
                ..Default::default()
            })
            .collect(),
        source_id: gallery_id,
        description: "".to_string(),
        chapters: vec![Chapter {
            title,
            url: term.clone(),
            number: 1,
            pages,
            description: "".to_string(),
        }],
        authors: authors
            .into_iter()
            .filter_map(|name| {
                if name.is_empty() {
                    None
                } else {
                    Some(Author {
                        name,
                        ..Default::default()
                    })
                }
            })
            .collect(),
        tags: tags
            .into_iter()
            .filter_map(|name| {
                if name.is_empty() {
                    None
                } else {
                    Some(Tag {
                        name,
                        metadata: vec![],
                    })
                }
            })
            .collect(),
        metadata,
    };

    Ok(book)
}

fn print_command_invocation(command: &Command) -> String {
    let bin = command.get_program().to_string_lossy();

    let args: Vec<String> = command
        .get_args()
        .map(|arg| arg.to_string_lossy().to_string())
        .collect();

    format!("{} {}", bin, args.join(" "))
}

fn get_if_not_str_rec(field: &str, value: &serde_json::Value) -> anyhow::Result<String> {
    match value {
        serde_json::Value::Object(m) => {
            if let Some(v) = m.get(field) {
                return get_if_not_str_rec(field, v);
            }
            anyhow::bail!("Field 'name' not found in {m:?}")
        }
        serde_json::Value::String(s) => Ok(s.clone()),
        _ => anyhow::bail!("Could not get name from {value:?}"),
    }
}
