use std::collections::HashMap;

use anyhow::Context;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::{cli::fetch::SharedFetchOption, schemas::cookies::NetscapeCookie};

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Config {
    pub version: String,
    pub download_folder: DownloadFolder,
    pub cache: Cache,
    pub delay: Delay,
    pub max_size_batch: u32,
    pub verbose: bool,
    pub request: Request,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct DownloadFolder {
    pub download: PathBuf,
    pub temp: PathBuf,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Cache {
    pub enable: bool,
    pub folder: PathBuf,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Delay {
    pub fetch: u32,
    pub download: u32,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Request {
    pub headers: HashMap<String, String>,
    pub cookies: HashMap<String, HashMap<String, String>>,
    pub active_on: Vec<String>,
}

impl Config {
    pub fn new() -> Self {
        let mut cookies: HashMap<String, HashMap<String, String>> = HashMap::new();
        cookies.entry("_".to_string()).or_default();
        Self {
            version: "0.0.1".to_string(),
            download_folder: DownloadFolder {
                download: PathBuf::from("./download/download"),
                temp: PathBuf::from("./download/temp"),
            },
            cache: Cache {
                enable: true,
                folder: PathBuf::from("./cache"),
            },
            delay: Delay {
                fetch: 100,
                download: 100,
            },
            max_size_batch: 10,
            verbose: false,
            request: Request {
                headers: HashMap::new(),
                cookies,
                active_on: vec![],
            },
        }
    }

    pub fn load() -> anyhow::Result<Config> {
        let yaml_cfg = PathBuf::from("mx-config.yaml");
        let json_cfg = PathBuf::from("mx-config.json");

        if yaml_cfg.exists() {
            let content = std::fs::read_to_string(&yaml_cfg)
                .with_context(|| format!("Loading {}", yaml_cfg.to_string_lossy()))?;
            return serde_yaml::from_str(&content).map_err(|e| e.into());
        } else if json_cfg.exists() {
            let content = std::fs::read_to_string(&json_cfg)
                .with_context(|| format!("Loading {}", yaml_cfg.to_string_lossy()))?;
            return serde_yaml::from_str(&content).map_err(|e| e.into());
        }

        println!(
            "Creating configuration file at {}",
            std::env::current_dir().unwrap().to_string_lossy()
        );

        let default_value = Config::new();
        std::fs::write(yaml_cfg, serde_yaml::to_string(&default_value).unwrap())?;

        Ok(default_value)
    }

    pub fn adapt_override(&mut self, fetch_option: SharedFetchOption) -> anyhow::Result<&mut Self> {
        if let Some(no_cache) = fetch_option.no_cache {
            self.cache.enable = !no_cache;
        }

        if let Some(file) = fetch_option.cookies {
            let content: String = std::fs::read_to_string(file)?;
            let cookies = NetscapeCookie::from_json(&content)?;
            let cookies_m: HashMap<String, String> = NetscapeCookie::to_map(cookies);

            self.request.cookies.insert("_".to_string(), cookies_m);
        }

        Ok(self)
    }
}
