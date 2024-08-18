use std::time::Duration;

use anyhow::Context;
use python::PythonPlugin;

use crate::{
    schemas::book::{Book, PluginOption, SearchOption},
    GLOBAL_CONFIG,
};
pub mod python;

pub trait MXPlugin {
    async fn init(&mut self) -> anyhow::Result<()>;
    async fn destroy(&mut self) -> anyhow::Result<()>;
    fn configure(&mut self, option: PluginOption) -> anyhow::Result<()>;
    async fn get_book(&self, query: String) -> anyhow::Result<Book>;
    async fn is_supported(&self, query: String) -> anyhow::Result<bool>;
    async fn search(&self, term: String, option: SearchOption) -> anyhow::Result<Vec<Book>>;
}

#[derive(Debug)]
pub enum PluginImpl {
    Python(PythonPlugin),
    // TODO:
    // Lua(LuaPlugin)
    // OldNXScraper(OldNXScraperPlugin) // full rust
    // GalleryDL(GalleryDLPlugin) // full rust
}

pub struct PluginManager {
    plugins: Vec<PluginImpl>,
}

#[derive(Debug, Clone)]
pub struct FetchResult {
    pub query_term: String,
    pub book: Book,
    pub plugin_name: String,
    pub cached: bool,
}

impl PluginManager {
    pub fn new() -> Self {
        Self { plugins: vec![] }
    }

    /// Fetch a term using the first plugin that supports it
    pub async fn auto_fetch(&self, term: String) -> anyhow::Result<FetchResult> {
        let mut issues = vec![];
        for plugin in &self.plugins {
            match plugin {
                PluginImpl::Python(py) => {
                    if py.is_supported(term.clone()).await? {
                        match self.fetch(term.clone(), py.name.clone()).await {
                            Ok(f) => return Ok(f),
                            Err(e) => {
                                issues.push(format!("  - Plugin {}: {e}", py.name));
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

    /// Fetch and bypass term validation
    pub async fn fetch(&self, term: String, plugin_name: String) -> anyhow::Result<FetchResult> {
        for plugin in &self.plugins {
            match plugin {
                PluginImpl::Python(py) => {
                    if py.name.eq(&plugin_name) {
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
                            let book = py.get_book(term.clone()).await?;
                            let content = serde_json::to_string_pretty(&book)?;
                            std::fs::write(&cache_file_path, content).with_context(|| {
                                format!("Writing cache {:?}", cache_file_path.display())
                            })?;
                            book
                        };
                        tokio::time::sleep(Duration::from_millis(delay.fetch as u64)).await;

                        return Ok(FetchResult {
                            query_term: term.clone(),
                            book,
                            plugin_name,
                            cached,
                        });
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
                PluginImpl::Python(py) => py.name.clone(),
            })
            .collect()
    }

    /// A list of all installed plugins
    pub fn assert_exists(&self, plugin_name: String) -> anyhow::Result<()> {
        if !self.list_plugins().contains(&plugin_name) {
            anyhow::bail!("Plugin named {plugin_name:?} does not exist")
        }
        Ok(())
    }

    /// Initialize all plugins
    pub async fn init(&mut self) -> anyhow::Result<()> {
        let location = { GLOBAL_CONFIG.read().unwrap().plugins.clone().location };
        self.prepare_folders();

        // Add static plugins then collect dynamic ones
        // For now, we have dynamic ones (python)
        // static plugins can be added directly in the Vec below

        let mut plugins = vec![];
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
                // println!(" + Discovered {plugin_name}");
                let python = PythonPlugin {
                    name: plugin_name.clone(),
                    workdir: None,
                };
                plugins.push(PluginImpl::Python(python));
            }
        }

        // init all
        for plugin in plugins.iter_mut() {
            match plugin {
                PluginImpl::Python(py) => py.init().await?,
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
            }
        }
        Ok(())
    }
}
