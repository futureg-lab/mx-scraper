use std::collections::HashSet;

use crate::schemas::{coerce_as_opt_string_on_number, default_on_null, liftvec_on_singleton};
use anyhow::Ok;
use indexmap::IndexSet;
use serde::{de::DeserializeOwned, Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Gallery {
    #[serde(default, alias = "manga")]
    title: Option<String>,

    #[serde(default, deserialize_with = "liftvec_on_singleton")]
    title_aliases: Vec<String>,

    #[serde(
        default,
        alias = "manga_id",
        deserialize_with = "coerce_as_opt_string_on_number"
    )]
    gallery_id: Option<String>,

    #[serde(default)]
    user: Option<serde_json::Value>,

    #[serde(
        default,
        alias = "artist",
        alias = "authors",
        alias = "author",
        deserialize_with = "liftvec_on_singleton"
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

    #[serde(default, deserialize_with = "liftvec_on_singleton")]
    tags: Vec<String>,

    #[serde(default, deserialize_with = "liftvec_on_singleton")]
    hashtags: Vec<String>,

    #[serde(flatten)]
    _remaining_fields: serde_json::Value,
}

#[derive(Debug, Serialize, Clone, Deserialize, Default)]
pub struct GalleryPage {
    #[serde(default)]
    pub title: String,
    filename: Option<String>,
    extension: Option<String>,
    #[serde(default, deserialize_with = "liftvec_on_singleton")]
    tags: Vec<String>,
    #[serde(default, deserialize_with = "liftvec_on_singleton")]
    hashtags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FirstGalleryEntry(pub i32, pub Gallery);

#[derive(Debug, Serialize, Deserialize)]
pub struct UrlGalleryEntry(pub i32, pub String, pub serde_json::Value);

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GalleryItem {
    TwoElementTuple(FirstGalleryEntry),
    ThreeElementTuple(UrlGalleryEntry),
}

impl Gallery {
    pub fn inspect_unprocessed_field<O: DeserializeOwned>(
        &self,
        field: &str,
    ) -> anyhow::Result<Option<O>> {
        match &self._remaining_fields {
            serde_json::Value::Object(m) => {
                let value = m
                    .get(field)
                    .map(|v| serde_json::from_value(v.clone()))
                    .transpose()?;
                Ok(value)
            }
            _ => Ok(None),
        }
    }

    pub fn get_title_or_default(&self, default: String) -> String {
        self.title.clone().unwrap_or_else(|| {
            let title_like = &["search_tags"];
            for title in title_like {
                let res: anyhow::Result<Option<String>> =
                    self.inspect_unprocessed_field(title).map_err(|e| e.into());
                if res.is_ok() {
                    if let Some(value) = res.unwrap() {
                        return value.trim().to_string();
                    }
                }
            }

            default
        })
    }

    pub fn get_id_or_default(&self, default: String) -> String {
        self.gallery_id.clone().unwrap_or(default)
    }

    pub fn get_title_aliases(&self) -> IndexSet<String> {
        let mut title_aliases = IndexSet::new();
        title_aliases.extend(self.title_aliases.clone());
        title_aliases
    }

    pub fn get_tags(&self) -> IndexSet<String> {
        let mut tags = IndexSet::new();
        tags.extend(self.hashtags.clone());
        tags.extend(self.tags.clone());
        tags.extend(self.characters.clone());
        tags.extend(self.parody.clone());
        tags.insert(self.category.clone());
        tags.insert(self.subcategory.clone());
        tags.insert(self.language.clone());

        if let serde_json::Value::Object(m) = &self._remaining_fields {
            fn get_as_string(value: &serde_json::Value) -> Option<String> {
                match value {
                    serde_json::Value::Bool(b) => Some(b.to_string()),
                    serde_json::Value::Number(n) => Some(n.to_string()),
                    serde_json::Value::String(s) => Some(s.to_string()),
                    _ => None,
                }
            }

            m.iter()
                .filter_map(|(k, v)| {
                    if k.starts_with("tag_") {
                        if let serde_json::Value::Array(a) = v {
                            return Some(
                                a.iter().filter_map(get_as_string).collect::<HashSet<_>>(),
                            );
                        } else if let Some(s) = get_as_string(v) {
                            let mut ret = HashSet::new();
                            ret.extend(s.split_whitespace().map(|s| s.to_string()));
                            return Some(ret);
                        }
                    }
                    None
                })
                .for_each(|set| {
                    tags.extend(set);
                });
        }

        tags
    }

    pub fn get_authors(&self) -> anyhow::Result<IndexSet<String>> {
        let mut authors = IndexSet::new();
        authors.extend(
            self.artists
                .iter()
                .map(|v| {
                    get_if_not_str_rec("name", v).map_err(|e| {
                        anyhow::anyhow!("Processing authors from {:?}: {e}", self.artists)
                    })
                })
                .collect::<anyhow::Result<Vec<_>>>()?,
        );

        if let Some(user) = &self.user {
            authors
                .insert(get_if_not_str_rec("name", user).map_err(|e| {
                    anyhow::anyhow!("Processing authors from {:?}: {e}", self.user)
                })?);
        }

        authors.extend(self.group.clone());
        Ok(authors)
    }
}

impl GalleryPage {
    pub fn get_filename(&self) -> Option<String> {
        self.filename.as_ref().map(|f| match &self.extension {
            None => format!("{f}.jpg"),
            Some(ext) => format!("{f}.{ext}"),
        })
    }

    pub fn get_explicit_tags(&self) -> IndexSet<String> {
        let mut tags = IndexSet::new();
        tags.extend(self.tags.clone());
        tags.extend(self.hashtags.clone());
        tags
    }
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
