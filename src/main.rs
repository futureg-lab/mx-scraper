mod cli;
mod core;
mod plugins;
mod schemas;
mod tests;

use anyhow::Context;
use clap::Parser;
use cli::MainCommand;
use std::sync::{Arc, Mutex};

use lazy_static::lazy_static;
use plugins::PluginManager;
use schemas::config::Config;

lazy_static! {
    static ref GLOBAL_CONFIG: Arc<Mutex<Config>> = Arc::new(Mutex::new(
        Config::load().with_context(|| "Loading config").unwrap()
    ));
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut manager = PluginManager::new();
    manager.init().await?;

    let parser = MainCommand::parse();
    match parser.command.run(&mut manager).await {
        Ok(_) => {
            manager.destroy().await?;
            Ok(())
        }
        Err(e) => {
            manager.destroy().await?;
            Err(e)
        }
    }
}
