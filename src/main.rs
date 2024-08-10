mod cli;
mod core;
mod plugins;
mod schemas;
mod tests;

use clap::Parser;
use cli::MainCommand;

use plugins::PluginManager;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut manager = PluginManager::new();
    manager.init().await?;

    if let Err(e) = MainCommand::parse().command.run(&mut manager).await {
        eprintln!("Failed..");
        eprintln!("{e}")
    }

    manager.destroy().await?;
    Ok(())
}
