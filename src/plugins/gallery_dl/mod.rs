use std::{
    path::{Path, PathBuf},
    process::Command,
    str::FromStr,
};

use crate::{
    core::utils::{self, extract_filename},
    schemas::book::{Author, Book, Chapter, Metadata, Page, SearchOption, Tag, TitleAlias},
    GLOBAL_CONFIG,
};
use anyhow::Ok;
use indexmap::IndexSet;
use schema::{FirstGalleryEntry, GalleryItem, GalleryPage, UrlGalleryEntry};
use serde::{Deserialize, Serialize};
use url::Url;

use super::MXPlugin;
pub mod schema;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ExtraConfig {
    pub bin: PathBuf,
    pub argv: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct GalleryDLPlugin {
    pub name: String,
    pub extra_config: ExtraConfig,
}

impl GalleryDLPlugin {
    pub fn new() -> Self {
        // TODO:
        // Rewrite everything to be generator based
        // - metadata can still be oneshoted at init
        // Rewrite downloading to be localized within the plugin and not global
        // - Still have a generic 'global' downloader for most usecases
        // - Allow custom downloading process to be taken over by the plugin
        //   - the plugin should emit instead progress events
        //   - progress can be unlimited
        let name = String::from("gallery-dl");
        let extra_config = GLOBAL_CONFIG
            .read()
            .unwrap()
            .request
            .get(&name)
            .and_then(|req| {
                let bin = req
                    .extra_config
                    .clone()
                    .and_then(|cfg| cfg.get("bin").cloned());
                let argv = req
                    .extra_config
                    .clone()
                    .and_then(|cfg| cfg.get("argv").cloned());

                Some(ExtraConfig {
                    bin: bin
                        .map(PathBuf::from)
                        .unwrap_or(PathBuf::from("gallery-dl")),
                    argv: shlex::split(&argv.unwrap_or("".to_owned())).unwrap_or(vec![]),
                })
            })
            .unwrap_or(ExtraConfig {
                bin: PathBuf::from("gallery-dl"),
                argv: vec![],
            });

        Self { extra_config, name }
    }
}

impl MXPlugin for GalleryDLPlugin {
    async fn init(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    async fn destroy(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    async fn get_book(&self, term: String) -> anyhow::Result<Book> {
        let mut command = Command::new(&self.extra_config.bin);
        let command = command.arg(&term).arg("--dump-json");
        if !self.extra_config.argv.is_empty() {
            for arg in &self.extra_config.argv {
                command.arg(arg);
            }
        }
        let output = command.output()?;

        if !output.status.success() {
            let lines = &[
                format!("stdout: {}", String::from_utf8_lossy(&output.stdout)),
                format!("stderr: {}", String::from_utf8_lossy(&output.stderr)),
            ];
            anyhow::bail!("{}", lines.join("\n").to_string());
        }

        let items: Vec<GalleryItem> = serde_json::from_slice(&output.stdout).map_err(|e| {
            anyhow::anyhow!(
                "Parse result of '{}': {e}",
                print_command_invocation(&command)
            )
        })?;

        generate_book(term, items)
    }

    async fn search(&self, _term: String, _option: SearchOption) -> anyhow::Result<Vec<Book>> {
        unimplemented!()
    }

    async fn is_supported(&self, term: String) -> anyhow::Result<bool> {
        let mut command = Command::new(&self.extra_config.bin);
        let output = command.arg(&term).arg("--extractor-info").output()?;
        Ok(output.status.success())
    }

    fn download_url(&self, dest: &Path, url: &Url) -> Option<anyhow::Result<()>> {
        let body = || -> anyhow::Result<()> {
            let mut command = Command::new(&self.extra_config.bin);
            let parent = dest.parent().unwrap();
            let filename = dest.file_name().unwrap();
            let tmp_dest = parent.join(format!("{}_temp", filename.to_string_lossy()));

            let output = command
                .arg("--directory")
                .arg(&tmp_dest)
                .arg(url.to_string())
                .output()?;

            if output.status.success() {
                // dl expects dest to be a directory, which is not the case
                // actual/path/page.jpg_temp/custom_name_by_dl.jpg
                // => actual/path/page.jpg
                if let Some(entry) = (std::fs::read_dir(&tmp_dest)?).next() {
                    std::fs::rename(&tmp_dest.join(entry?.file_name()), &dest)?;
                    std::fs::remove_dir_all(&tmp_dest)?;
                }
            }

            Ok(())
        };
        Some(body())
    }
}

pub fn generate_book(term: String, items: Vec<GalleryItem>) -> anyhow::Result<Book> {
    let placeholder_title = utils::resume_text(&term, Some(20)).to_string();
    let mut title = placeholder_title.trim().to_owned();
    let mut title_aliases = IndexSet::new();
    let mut gallery_id = title.clone();

    let mut tags: IndexSet<String> = IndexSet::new();
    let mut authors: IndexSet<String> = IndexSet::new();

    let mut pages = vec![];
    for (p, item) in items.iter().enumerate() {
        match item {
            GalleryItem::TwoElementTuple(FirstGalleryEntry(_len, gl)) => {
                title = extract_title_if_url(gl.get_title_or_default(term.clone()));
                gallery_id = gl.get_id_or_default(term.clone());

                title_aliases.extend(gl.get_title_aliases());
                tags.extend(gl.get_tags());
                authors.extend(gl.get_authors()?);
            }
            GalleryItem::ThreeElementTuple(UrlGalleryEntry(_len, url, meta)) => {
                let gpage = serde_json::from_value::<GalleryPage>(meta.clone())?;

                let filename = gpage.get_filename().unwrap_or_else(|| {
                    extract_filename(&Url::from_str(&url).unwrap()).unwrap_or_else(|| p.to_string())
                });

                let page_meta = meta.as_object().map(|o| {
                    if !o.is_empty() {
                        vec![Metadata {
                            label: filename.clone(),
                            content: meta.clone(),
                        }]
                    } else {
                        vec![]
                    }
                });

                tags.extend(gpage.get_explicit_tags());

                pages.push(Page {
                    title: gpage.title,
                    url: url.clone(),
                    number: p as u32,
                    filename,
                    metadata: page_meta.unwrap_or_else(|| vec![]),
                    ..Default::default()
                });
            }
        }
    }

    gallery_id = utils::set_if_empty(
        gallery_id,
        utils::compute_query_signature(&term, "gallery-dl"),
    );

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
            ..Default::default()
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
        metadata: vec![],
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

fn extract_title_if_url(maybe_url: String) -> String {
    let std::result::Result::Ok(url) = Url::parse(&maybe_url) else {
        return maybe_url;
    };
    let Some(host) = url.host_str() else {
        return maybe_url;
    };
    match host {
        "x.com" | "www.x.com" | "twitter.com" | "www.twitter.com" => url
            .path_segments()
            .and_then(|mut s| s.find(|s| !s.is_empty()))
            .map(str::to_string)
            .unwrap_or(maybe_url),
        _ => maybe_url,
    }
}
