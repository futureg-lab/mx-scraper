use std::collections::HashMap;

use crate::{
    cli::fetch::SharedFetchOption,
    core::{http::FetchContext, utils},
    schemas::cookies::NetscapeCookie,
};
use anyhow::Context;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;

lazy_static! {
    static ref ALL: String = String::from("_all");
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Config {
    pub version: String,
    pub plugins: PluginOptions,
    pub download_folder: DownloadFolder,
    pub cache: Cache,
    pub delay: Delay,
    pub max_size_batch: usize,
    pub verbose: bool,
    pub custom_downloader: bool,
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

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdditionalOptions {
    focused_plugin: Option<String>,
    auth_kind: Option<AuthKind>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DownloadFolder {
    pub download: PathBuf,
    pub temp: PathBuf,
    pub metadata: PathBuf,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Cache {
    pub enable: bool,
    pub folder: PathBuf,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Delay {
    pub fetch: u32,
    pub download: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Request {
    pub user_agent: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub cookies: Option<HashMap<String, String>>,
    pub extra_config: Option<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PluginOptions {
    pub location: PathBuf,
    pub meta_only: bool,
}

impl Config {
    pub fn new() -> Self {
        let version = env!("CARGO_PKG_VERSION").to_owned();
        let mut request = HashMap::new();

        request.insert(
            ALL.clone(),
            Request {
                user_agent: Some(format!(
                    "mx-scraper/{version} ({}; {})",
                    std::env::consts::OS,
                    std::env::consts::ARCH,
                )),
                headers: serde_json::from_value(json!({
                    "Accept": "*/*",
                }))
                .unwrap(),
                ..Default::default()
            },
        );

        Self {
            version,
            plugins: PluginOptions {
                location: PathBuf::from("./plugins"),
                meta_only: false,
            },
            download_folder: DownloadFolder {
                download: PathBuf::from("./download/download"),
                temp: PathBuf::from("./download/temp"),
                metadata: PathBuf::from("./download/metadata"),
            },
            cache: Cache {
                enable: true,
                folder: PathBuf::from("./query_cache"),
            },
            delay: Delay {
                fetch: 25,
                download: 25,
            },
            max_size_batch: 10,
            verbose: false,
            request,
            __options: AdditionalOptions {
                ..Default::default()
            },
            custom_downloader: false,
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
        if fetch_option.no_cache {
            self.cache.enable = false;
        }

        if fetch_option.meta_only {
            self.plugins.meta_only = true;
        }

        self.verbose = fetch_option.verbose;

        self.custom_downloader = fetch_option.custom_downloader;

        if let Some(file) = fetch_option.cookies {
            let content = std::fs::read_to_string(file)?;
            let cookies = NetscapeCookie::from_json(&content)?;
            let cookies_m = NetscapeCookie::to_map::<HashMap<_, _>>(&cookies);

            self.request
                .entry(ALL.clone())
                .and_modify(|m| m.cookies = Some(cookies_m));
        }

        if let Some(batch_size) = fetch_option.batch_size {
            self.max_size_batch = batch_size;
        }

        // Prepare __options
        if let Some(focused_plugin) = fetch_option.plugin {
            self.__options.focused_plugin = Some(focused_plugin);
        }
        if let Some(auth) = fetch_option.auth {
            self.__options.auth_kind = Some(auth.gen_basic_auth()?);
        }

        Ok(self)
    }

    /// Collect headers, auth and other relevant options for http queries
    pub fn gen_fetch_context(&self) -> FetchContext {
        let AdditionalOptions {
            focused_plugin,
            auth_kind,
        } = &self.__options;

        let shared = self.request.get(&ALL.to_string()).unwrap();
        let shared_ctx = FetchContext {
            user_agent: shared.user_agent.clone(),
            auth: auth_kind.clone(),
            cookies: NetscapeCookie::from_hashmap(&shared.cookies.clone().unwrap_or_default()),
            headers: shared.headers.clone().unwrap_or_default(),
        };

        match focused_plugin {
            Some(plugin_name) => {
                if let Some(req) = self.request.get(plugin_name) {
                    return FetchContext {
                        user_agent: { req.user_agent.clone().map_or(shared_ctx.user_agent, Some) },
                        headers: {
                            let mut inherited = shared_ctx.headers.clone();
                            inherited.extend(req.headers.clone().unwrap_or_default());
                            inherited
                        },
                        cookies: {
                            let mut inherited = shared_ctx.cookies.clone();
                            let this = NetscapeCookie::from_hashmap(
                                &req.cookies.clone().unwrap_or_default(),
                            );
                            inherited.extend(this);
                            inherited
                        },
                        auth: auth_kind.clone(),
                    };
                }

                shared_ctx
            }
            None => shared_ctx,
        }
    }

    pub fn get_cache_file_path(&self, term: &str, plugin_name: &str) -> PathBuf {
        let signature = utils::compute_query_signature(term, plugin_name);
        self.cache.folder.join(format!("{signature}.json"))
    }
}
