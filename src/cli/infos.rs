use clap::Parser;

use crate::plugins::PluginManager;

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
    pub async fn display(&self, manager: &mut PluginManager) -> anyhow::Result<()> {
        match (self.plugins, self.config) {
            (true, _) => {
                let list = manager.list_plugins().await;
                let plugins = list
                    .iter()
                    .map(|item| format!("  - {}", item))
                    .collect::<Vec<String>>()
                    .join("\n");
                println!("Installed Plugins:\n{plugins}");
            }
            (_, true) => unimplemented!("🙏"),
            _ => eprintln!("Bad command, please check infos subcommand help"),
        }
        Ok(())
    }
}
