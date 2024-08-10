use std::path::Path;

use python::PythonPlugin;
use std::fs::canonicalize;

use crate::schemas::{
    book::{Book, PluginOption, SearchOption},
    config::Config,
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
    pub book: Book,
    pub plugin_name: String,
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
                        match py.get_book(term.clone()).await {
                            Ok(book) => {
                                return Ok(FetchResult {
                                    book,
                                    plugin_name: py.name.clone(),
                                })
                            }
                            Err(e) => {
                                issues.push(format!("  - Plugin {}: {e}", py.name));
                            }
                        }
                    }
                }
            }
        }

        if issues.len() > 0 {
            anyhow::bail!("\n{}", issues.join("\n"))
        } else {
            anyhow::bail!("No plugin supports the term {term:?}")
        }
    }

    /// Fetch and bypass term validation
    pub async fn fetch(&self, term: String, plugin_name: String) -> anyhow::Result<FetchResult> {
        for plugin in &self.plugins {
            match plugin {
                PluginImpl::Python(py) => {
                    if py.name.eq(&plugin_name) {
                        let book = py.get_book(term.clone()).await?;
                        return Ok(FetchResult { book, plugin_name });
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
        // Add static plugins then collect dynamic ones
        // For now, we have dynamic ones (python)
        // static plugins can be added directly in the Vec below

        let mut plugins = vec![];
        let plug_dir = canonicalize(Path::new("plugins"))?;

        // +-- plugins
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
