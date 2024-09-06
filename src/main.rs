mod cli;
mod core;
mod plugins;
mod schemas;
mod tests;

use anyhow::Context;
use clap::Parser;
use cli::MainCommand;
use std::sync::{Arc, RwLock};

use lazy_static::lazy_static;
use plugins::PluginManager;
use schemas::config::Config;

lazy_static! {
    static ref GLOBAL_CONFIG: Arc<RwLock<Config>> = Arc::new(RwLock::new(
        Config::load().with_context(|| "Loading config").unwrap()
    ));
    static ref PLUGIN_MANAGER: Arc<RwLock<PluginManager>> =
        Arc::new(RwLock::new(PluginManager::new()));
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let parser = MainCommand::parse();

    {
        PLUGIN_MANAGER.write().unwrap().init().await?;
    }

    match parser.command.run().await {
        Ok(_) => {
            PLUGIN_MANAGER.write().unwrap().destroy().await?;
            Ok(())
        }
        Err(e) => {
            PLUGIN_MANAGER.write().unwrap().destroy().await?;
            Err(e)
        }
    }
}
