mod cli;
mod core;
mod plugins;
mod schemas;
mod tests;

use clap::Parser;
use cli::MainCommand;

use plugins::PluginManager;
use schemas::config::Config;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config::load()?;

    let mut manager = PluginManager::new(config);
    manager.init().await?;

    if let Err(e) = MainCommand::parse().command.run(&mut manager).await {
        eprintln!("Failed..");
        eprintln!("{e}")
    }

    manager.destroy().await?;
    Ok(())
}
