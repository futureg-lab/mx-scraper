use std::{path::Path, time::Duration};

use anyhow::Context;
use async_graphql::SimpleObject;
use gallery_dl::GalleryDLPlugin;
use python::PythonPlugin;
use url::Url;

use crate::{
    schemas::book::{Book, SearchOption},
    GLOBAL_CONFIG,
};

pub mod gallery_dl;
pub mod python;

pub trait MXPlugin {
    async fn init(&mut self) -> anyhow::Result<()>;
    async fn destroy(&mut self) -> anyhow::Result<()>;
    async fn get_book(&self, query: String) -> anyhow::Result<Book>;
    async fn is_supported(&self, query: String) -> anyhow::Result<bool>;
    #[allow(unused)]
    async fn search(&self, term: String, option: SearchOption) -> anyhow::Result<Vec<Book>>;
    fn download_url(&self, dest: &Path, url: &Url) -> Option<anyhow::Result<()>>;
}

#[derive(Debug)]
pub enum PluginImpl {
    Python(PythonPlugin),
    GalleryDL(GalleryDLPlugin),
    // TODO:
    // Lua(LuaPlugin)
    // OldNXScraper(OldNXScraperPlugin) // full rust
}

// FIXME: refactor wrapper type ops with generic apply
// "cycle used when checking that `plugins::<impl at src\plugins\mod.rs:33:1: 33:16>::apply` is well-formed"
// issue partly due to async traits (Sized Requirement for dyn Trait)

// impl PluginImpl {
//     pub fn apply<F, R>(&self, func: F) -> R
//     where
//         F: Fn(Box<dyn MXPlugin>) -> R,
//     {
//         match self {
//             PluginImpl::Python(plugin) => func(plugin),
//             PluginImpl::GalleryDL(plugin) => func(plugin),
//         }
//     }
// }

pub struct PluginManager {
    plugins: Vec<PluginImpl>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct FetchResult {
    pub query_term: String,
    pub book: Book,
    pub plugin_name: String,
    pub cached: bool,
}

impl FetchResult {
    pub fn count_pages(&self) -> usize {
        let mut total = 0;
        for chapter in &self.book.chapters {
            total += chapter.pages.len();
        }

        total
    }
}

impl PluginManager {
    pub fn new() -> Self {
        Self { plugins: vec![] }
    }

    /// Fetch a term using the first plugin that can handle it
    pub async fn auto_fetch(&self, term: String) -> anyhow::Result<FetchResult> {
        let mut issues = vec![];
        for plugin in &self.plugins {
            match plugin {
                PluginImpl::Python(py) => {
                    let supported = match py.is_supported(term.clone()).await {
                        Ok(verdict) => verdict,
                        Err(e) => {
                            issues.push(format!("  - Plugin {}: {e}", py.name));
                            false
                        }
                    };

                    if supported {
                        match self.fetch(term.clone(), py.name.clone()).await {
                            Ok(f) => return Ok(f),
                            Err(e) => {
                                issues.push(format!("  - Plugin {}: {e}", py.name));
                            }
                        }
                    }
                }
                PluginImpl::GalleryDL(dl) => {
                    let supported = match dl.is_supported(term.clone()).await {
                        Ok(verdict) => verdict,
                        Err(e) => {
                            issues.push(format!("  - Plugin {}: {e}", dl.name));
                            false
                        }
                    };

                    if supported {
                        match self.fetch(term.clone(), dl.name.clone()).await {
                            Ok(f) => return Ok(f),
                            Err(e) => {
                                issues.push(format!("  - Plugin {}: {e}", dl.name));
                            }
                        }
                    }
                }
            }
        }

        if !issues.is_empty() {
            anyhow::bail!("\n{}", issues.join("\n"))
        } else {
            anyhow::bail!("Cannot auto-detect plugin that supports the term {term:?}\nYou can try with --plugin <PLUGIN_NAME>")
        }
    }

    async fn fetch_by_plugin<P: MXPlugin>(
        term: String,
        plugin_name: String,
        plugin: &P,
    ) -> anyhow::Result<FetchResult> {
        let (enable_cache, cache_file_path, delay) = {
            let config = GLOBAL_CONFIG.read().unwrap();
            (
                config.cache.enable,
                config.get_cache_file_path(&term, &plugin_name),
                config.delay.clone(),
            )
        };

        let mut cached = false;

        let book = if enable_cache && cache_file_path.exists() {
            cached = true;
            let content = std::fs::read_to_string(&cache_file_path)?;
            serde_json::from_str(&content).with_context(|| {
                format!(
                    "Deserializing cache file for term {term} located at {:?}",
                    cache_file_path.display()
                )
            })?
        } else {
            let book = plugin.get_book(term.clone()).await?;
            let content = serde_json::to_string_pretty(&book)?;
            std::fs::write(&cache_file_path, content)
                .with_context(|| format!("Writing cache {:?}", cache_file_path.display()))?;
            book
        };
        tokio::time::sleep(Duration::from_millis(delay.fetch as u64)).await;

        Ok(FetchResult {
            query_term: term.clone(),
            book,
            plugin_name,
            cached,
        })
    }

    /// Fetch and bypass term validation
    pub async fn fetch(&self, term: String, plugin_name: String) -> anyhow::Result<FetchResult> {
        for plugin in &self.plugins {
            match plugin {
                PluginImpl::Python(plugin) => {
                    if plugin.name.eq(&plugin_name) {
                        return Self::fetch_by_plugin(term, plugin_name, plugin).await;
                    }
                }
                PluginImpl::GalleryDL(plugin) => {
                    if plugin.name.eq(&plugin_name) {
                        return Self::fetch_by_plugin(term, plugin_name, plugin).await;
                    }
                }
            }
        }

        anyhow::bail!("No plugin named {plugin_name:?}")
    }

    /// A list of all installed plugins
    pub fn list_plugins(&self) -> Vec<String> {
        self.plugins
            .iter()
            .map(|plugin| match plugin {
                PluginImpl::Python(plugin) => plugin.name.clone(),
                PluginImpl::GalleryDL(plugin) => plugin.name.clone(),
            })
            .collect()
    }

    /// Fail if name is missing
    pub fn assert_exists(&self, plugin_name: String) -> anyhow::Result<()> {
        if !self.list_plugins().contains(&plugin_name) {
            anyhow::bail!("Plugin named {plugin_name:?} does not exist")
        }
        Ok(())
    }

    /// Custom downloader for a plugin
    pub fn download_url(
        &self,
        plugin_name: &str,
        dest: &Path,
        url: &Url,
    ) -> Option<anyhow::Result<()>> {
        for plugin in self.plugins.iter() {
            match plugin {
                PluginImpl::Python(plugin) => {
                    if plugin_name.eq(&plugin.name) {
                        return plugin.download_url(dest, url);
                    }
                }
                PluginImpl::GalleryDL(plugin) => {
                    if plugin_name.eq(&plugin.name) {
                        return plugin.download_url(dest, url);
                    }
                }
            }
        }
        None
    }

    /// Initialize all plugins
    pub async fn init(&mut self) -> anyhow::Result<()> {
        let location = { GLOBAL_CONFIG.read().unwrap().plugins.clone().location };
        self.prepare_folders();

        let mut dyn_plugins = vec![];
        let static_plugins = vec![PluginImpl::GalleryDL(GalleryDLPlugin::new())];

        let plug_dir = location.canonicalize()?;
        // +-- plugin_location
        //   +- foo
        //      + __init__.py
        //   +- bar
        //      + __init__.py

        for entry in plug_dir.read_dir()? {
            let entry = entry?;
            let plugin_name = entry.file_name().to_string_lossy().to_string();
            let workdir = plug_dir.join(plugin_name.clone()).to_path_buf();
            let actual_plugin = workdir.join("__init__.py");
            if actual_plugin.exists() {
                let python = PythonPlugin {
                    name: plugin_name.clone(),
                    workdir: None,
                };
                dyn_plugins.push(PluginImpl::Python(python));
            }
        }

        let mut plugins = dyn_plugins
            .into_iter()
            .chain(static_plugins.into_iter())
            .collect::<Vec<PluginImpl>>();

        for plugin in plugins.iter_mut() {
            match plugin {
                PluginImpl::Python(py) => py.init().await?,
                PluginImpl::GalleryDL(dl) => dl.init().await?,
            }
        }

        self.plugins = plugins;
        Ok(())
    }

    fn prepare_folders(&self) {
        let (cache_folder, download, temp, metadata, plugins) = {
            let config = GLOBAL_CONFIG.read().unwrap();
            (
                config.cache.folder.clone(),
                config.download_folder.download.clone(),
                config.download_folder.temp.clone(),
                config.download_folder.metadata.clone(),
                config.plugins.location.clone(),
            )
        };

        std::fs::create_dir_all(&cache_folder)
            .with_context(|| format!("Create cache folder {:?}", cache_folder.display()))
            .unwrap();

        std::fs::create_dir_all(&temp)
            .with_context(|| format!("Create temp folder {:?}", temp.display()))
            .unwrap();

        std::fs::create_dir_all(&download)
            .with_context(|| format!("Create download folder {:?}", download.display()))
            .unwrap();

        std::fs::create_dir_all(&metadata)
            .with_context(|| format!("Create metadata folder {:?}", metadata.display()))
            .unwrap();

        std::fs::create_dir_all(&plugins)
            .with_context(|| format!("Create plugin folder {:?}", plugins.display()))
            .unwrap();
    }

    /// Destroy all plugins and free-up ressources
    pub async fn destroy(&mut self) -> anyhow::Result<()> {
        for plugin in self.plugins.iter_mut() {
            match plugin {
                PluginImpl::Python(py) => py.destroy().await?,
                PluginImpl::GalleryDL(dl) => dl.destroy().await?,
            }
        }
        Ok(())
    }
}
