use crate::{
    core::http::basic::BasicRequestResolver,
    schemas::{config::AuthKind, cookies::NetscapeCookie},
    FETCH_SEMAPHORE,
};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, COOKIE, USER_AGENT};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, str::FromStr, sync::Arc};
use tokio::sync::Semaphore;
use url::Url;

pub mod basic;
pub mod cf_worker;
pub mod flaresolverr;

#[derive(Default, Debug, Serialize, Deserialize, Clone)]
pub struct FetchContext {
    #[serde(default)]
    pub user_agent: Option<String>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub cookies: Vec<NetscapeCookie>,
    #[serde(default)]
    pub auth: Option<AuthKind>,
}

impl FetchContext {
    pub fn override_inherit_from(&mut self, other: &FetchContext) {
        if other.user_agent.is_some() {
            self.user_agent = other.user_agent.clone();
        }

        for (key, value) in &other.headers {
            self.headers
                .entry(key.clone())
                .or_insert_with(|| value.clone());
        }

        self.cookies.extend(other.cookies.iter().cloned());

        if other.user_agent.is_some() {
            self.auth = other.auth.clone();
        }
    }

    pub fn to_headermap(&self) -> anyhow::Result<HeaderMap> {
        let mut req_headers = HeaderMap::new();
        if let Some(ua) = &self.user_agent {
            req_headers.insert(USER_AGENT, HeaderValue::from_str(ua)?);
        }

        for (k, v) in &self.headers {
            req_headers.insert(HeaderName::from_str(k)?, HeaderValue::from_str(v)?);
        }
        req_headers.insert(
            COOKIE,
            HeaderValue::from_str(&NetscapeCookie::to_raw_string(&self.cookies))?,
        );

        Ok(req_headers)
    }
}

pub async fn update_fetch_semaphore_count(new_count: usize) {
    // Drain all permits
    let old_semaphore = FETCH_SEMAPHORE.read().await.clone();
    let available = old_semaphore.available_permits();
    let _ = old_semaphore.acquire_many_owned(available as u32).await;

    let mut rw = FETCH_SEMAPHORE.write().await;
    *rw = Arc::new(Semaphore::new(new_count));
}

#[async_trait::async_trait]
pub trait MxScraperHttpResolver: Sync + Send {
    fn get(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>>;
    async fn get_async(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>>;
}

pub struct MxScraperHttpClient {
    resolver: Arc<dyn MxScraperHttpResolver>,
}

#[derive(Debug)]
pub enum ContextProvider {
    Concrete(FetchContext),
    // FromConfig, // hides explicitness
    None,
}

impl ContextProvider {
    pub fn get(&self) -> FetchContext {
        match self {
            ContextProvider::Concrete(fetch_context) => fetch_context.clone(),
            ContextProvider::None => Default::default(),
        }
    }
}

impl MxScraperHttpClient {
    pub fn new(resolver: Arc<dyn MxScraperHttpResolver>) -> Self {
        Self { resolver }
    }
}

impl MxScraperHttpClient {
    pub fn get(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        self.resolver.get(url, context)
    }

    pub async fn get_async(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        let rw = FETCH_SEMAPHORE.read().await;
        let _permit = rw.acquire().await;

        self.resolver.get_async(url, context).await
    }

    pub async fn download(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        let rw = FETCH_SEMAPHORE.read().await;
        let _permit = rw.acquire().await;

        BasicRequestResolver.get_async(url, context).await
    }
}
