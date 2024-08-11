use std::collections::HashMap;

use anyhow::Context;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::{
    cli::fetch::SharedFetchOption, core::http::FetchContext, schemas::cookies::NetscapeCookie,
};

lazy_static! {
    static ref ALL: String = String::from("_all");
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Config {
    pub version: String,
    pub download_folder: DownloadFolder,
    pub cache: Cache,
    pub delay: Delay,
    pub max_size_batch: u32,
    pub verbose: bool,
    pub request: HashMap<String, Request>,
    #[serde(skip)]
    pub __options: AdditionalOptions,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum AuthKind {
    Basic {
        user: String,
        password: Option<String>,
    },
    Bearer {
        token: String,
    },
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct AdditionalOptions {
    focused_plugin: Option<String>,
    verbose: bool,
    auth_kind: Option<AuthKind>,
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
    pub cookies: Option<HashMap<String, String>>,
}

impl Config {
    pub fn new() -> Self {
        let mut request = HashMap::new();
        request.insert(
            ALL.clone(),
            Request {
                ..Default::default()
            },
        );

        Self {
            version: env!("CARGO_PKG_VERSION").to_owned(),
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
            request,
            __options: AdditionalOptions {
                ..Default::default()
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
            let content = std::fs::read_to_string(file)?;
            let cookies = NetscapeCookie::from_json(&content)?;
            let cookies_m: HashMap<String, String> = NetscapeCookie::to_map(&cookies);

            self.request
                .entry(ALL.clone())
                .and_modify(|m| m.cookies = Some(cookies_m));
        }

        // Prepare __options
        if let Some(focused_plugin) = fetch_option.plugin {
            self.__options.focused_plugin = Some(focused_plugin);
        }
        if let Some(auth) = fetch_option.auth {
            self.__options.auth_kind = Some(auth.gen_basic_auth()?);
        }
        self.__options.verbose = fetch_option.verbose;

        Ok(self)
    }

    /// Collect headers, auth and other relevant options for http queries
    pub fn gen_fetch_context(&self) -> FetchContext {
        let AdditionalOptions {
            focused_plugin,
            verbose: _,
            auth_kind,
        } = &self.__options;
        let req_key = focused_plugin.clone().unwrap_or(ALL.to_string());

        match self.request.get(&req_key) {
            Some(req) => FetchContext {
                auth: auth_kind.clone(),
                cookies: NetscapeCookie::from_hashmap(&req.cookies.clone().unwrap_or_default()),
                headers: req.headers.clone(),
            },
            None => FetchContext {
                auth: auth_kind.clone(),
                ..Default::default()
            },
        }
    }
}
