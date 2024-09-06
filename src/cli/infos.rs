use clap::Parser;

use crate::{GLOBAL_CONFIG, PLUGIN_MANAGER};

#[derive(Parser, Debug)]
pub struct Infos {
    /// List all plugins
    #[arg(required = false, long, short)]
    plugins: bool,
    /// Display configuration
    #[arg(required = false, long, short)]
    config: bool,
}

impl Infos {
    pub async fn display(&self) -> anyhow::Result<()> {
        let manager = PLUGIN_MANAGER.read().unwrap();
        match (self.plugins, self.config) {
            (true, _) => {
                let list = manager.list_plugins();
                let plugins = list
                    .iter()
                    .map(|item| format!("  - {}", item))
                    .collect::<Vec<String>>()
                    .join("\n");
                let total = list.len();
                println!("Installed Plugins ({total}):\n{plugins}");
            }
            (_, true) => {
                let config = {
                    let config = GLOBAL_CONFIG.read().unwrap().clone();
                    serde_yaml::to_string(&config).unwrap()
                };
                println!("{config}");
            }
            _ => eprintln!("Bad command, please check infos subcommand help"),
        }
        Ok(())
    }
}
