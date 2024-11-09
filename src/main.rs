mod cli;
mod core;
mod plugins;
mod schemas;
mod tests;

use std::sync::Arc;

use anyhow::Context;
use clap::Parser;
use cli::MainCommand;

use lazy_static::lazy_static;
use plugins::PluginManager;
use schemas::config::Config;

lazy_static! {
    static ref GLOBAL_CONFIG: Arc<std::sync::RwLock<Config>> = Arc::new(std::sync::RwLock::new(
        Config::load().with_context(|| "Loading config").unwrap()
    ));
    static ref PLUGIN_MANAGER: Arc<tokio::sync::RwLock<PluginManager>> =
        Arc::new(tokio::sync::RwLock::new(PluginManager::new()));
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let parser = MainCommand::parse();

    {
        PLUGIN_MANAGER.write().await.init().await?;
    }

    match parser.command.run().await {
        Ok(_) => {
            PLUGIN_MANAGER.write().await.destroy().await?;
            Ok(())
        }
        Err(e) => {
            PLUGIN_MANAGER.write().await.destroy().await?;
            Err(e)
        }
    }
}
