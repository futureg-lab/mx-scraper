mod cli;
mod core;
mod plugins;
mod schemas;
mod tests;

use anyhow::Context;
use clap::Parser;
use cli::MainCommand;
use std::sync::Mutex;

use lazy_static::lazy_static;
use plugins::PluginManager;
use schemas::config::Config;

lazy_static! {
    // maybe Arc<Mutex<Config>>?
    static ref GLOBAL_CONFIG: Mutex<Config> = Mutex::new(Config::load().with_context(|| "Loading config").unwrap());
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut manager = PluginManager::new();
    manager.init().await?;

    if let Err(e) = MainCommand::parse().command.run(&mut manager).await {
        eprintln!("{e}")
    }

    manager.destroy().await?;
    Ok(())
}
