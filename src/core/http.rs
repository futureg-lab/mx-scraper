use crate::{
    schemas::{config::AuthKind, cookies::NetscapeCookie},
    FETCH_SEMAPHORE,
};
use anyhow::Context;
use indexmap::IndexMap;
use reqwest::{
    blocking::{self},
    header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE, COOKIE, USER_AGENT},
    redirect::Policy,
    Client,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, str::FromStr, sync::Arc};
use tokio::sync::Semaphore;
use url::Url;

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
            req_headers.insert(USER_AGENT, HeaderValue::from_str(&ua)?);
        }

        for (k, v) in &self.headers {
            req_headers.insert(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
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

#[derive(Clone)]
pub struct BasicRequestResolver;

#[async_trait::async_trait]
impl MxScraperHttpResolver for BasicRequestResolver {
    fn get(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        let context = context.get();
        let req_headers = context.to_headermap()?;

        let bytes = std::thread::spawn(move || {
            // FIXME:
            // reqwest::blocking acting sus
            // "Cannot drop a runtime in a context where blocking is not allowed"
            // throwing it in a thread solves the issue
            let client = blocking::Client::builder()
                .redirect(Policy::limited(5))
                .build()?;

            let mut builder = client.get(url.clone()).headers(req_headers);
            if let Some(auth) = context.auth {
                builder = match auth {
                    AuthKind::Basic { user, password } => builder.basic_auth(user, password),
                    AuthKind::Bearer { token } => builder.bearer_auth(token),
                };
            }
            let response = builder.send()?;
            if !response.status().is_success() {
                anyhow::bail!(format!("{}: {}", response.status(), url));
            }

            Ok(response.bytes())
        })
        .join()
        .unwrap();

        Ok(bytes??.into())
    }

    async fn get_async(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        let context = context.get();
        let req_headers = context.to_headermap()?;

        let client = Client::builder().redirect(Policy::limited(5)).build()?;
        let mut builder = client.get(url.clone()).headers(req_headers);
        if let Some(auth) = context.auth {
            builder = match auth {
                AuthKind::Basic { user, password } => builder.basic_auth(user, password),
                AuthKind::Bearer { token } => builder.bearer_auth(token),
            };
        }
        let response = builder.send().await?;
        if !response.status().is_success() {
            anyhow::bail!(format!("{}: {}", response.status(), url));
        }

        Ok(response.bytes().await?.into())
    }
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct FlareSolverrResolver {
    pub endpoint: String,
    pub max_timeout: Option<u16>,
    pub session_ttl_minutes: Option<u16>,
}

impl FlareSolverrResolver {
    fn create_payload(
        &self,
        url: &Url,
        context: &ContextProvider,
    ) -> anyhow::Result<serde_json::Value> {
        let mut payload = json!({
            "cmd": "request.get",
            "url": url.as_str(),
        });

        if let Some(max_timeout) = self.max_timeout {
            payload["maxTimeout"] = serde_json::to_value(max_timeout)?;
        }

        if let Some(session_ttl_minutes) = self.session_ttl_minutes {
            payload["session_ttl_minutes"] = serde_json::to_value(session_ttl_minutes)?;
        }

        if let ContextProvider::Concrete(ctx) = context {
            // Note: skipping UA would be safer
            let mut headers = IndexMap::new();
            for (k, v) in &ctx.headers {
                headers.insert(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
            }

            if let Some(auth) = &ctx.auth {
                headers.insert(AUTHORIZATION, HeaderValue::from_str(&auth.stringify())?);
            }

            let headers = headers
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_str().unwrap()))
                .collect::<HashMap<_, _>>();
            payload["headers"] = serde_json::to_value(&headers)?;

            if !ctx.cookies.is_empty() {
                payload["cookies"] = NetscapeCookie::to_map(&ctx.cookies);
            }
        }

        Ok(payload)
    }
}

#[derive(Deserialize, Clone, Debug)]
#[allow(unused)]
pub struct FlareSolverrSolutionPartial {
    url: String,
    status: u16,
    headers: IndexMap<String, String>,
    response: String,
    cookies: Vec<serde_json::Value>,
    #[serde(rename = "userAgent")]
    user_agent: String,
    #[serde(flatten)]
    __others: serde_json::Value,
}

#[derive(Deserialize, Clone, Debug)]
#[allow(unused)]
pub struct FlareSolverrOutput {
    solution: FlareSolverrSolutionPartial,
    status: String,
    message: String,
    version: String,
    #[serde(flatten)]
    __others: serde_json::Value,
}

#[async_trait::async_trait]
impl MxScraperHttpResolver for FlareSolverrResolver {
    async fn get_async(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        let payload = self.create_payload(&url, &context)?;
        tracing::debug!("async: payload {payload}");
        let client = Client::new();
        let response = client
            .post(&self.endpoint)
            .header(CONTENT_TYPE, "application/json")
            .body(serde_json::to_string(&payload).unwrap())
            .send()
            .await?;

        if !response.status().is_success() {
            anyhow::bail!(format!("{}: {}", response.status(), url));
        }

        let response = serde_json::from_str::<FlareSolverrOutput>(&response.text().await?)
            .with_context(|| anyhow::anyhow!("Parsing Flaresolverr response"))?;

        if response.solution.status != 200 {
            anyhow::bail!(format!(
                "{}: {}",
                response.solution.status, response.solution.url
            ));
        }

        Ok(response.solution.response.as_bytes().to_vec())
    }

    fn get(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        let payload = self.create_payload(&url, &context)?;
        let endpoint = self.endpoint.clone();
        let bytes = std::thread::spawn(move || {
            let client = blocking::Client::new();
            tracing::debug!("sync: payload {payload}");
            let response = client
                .post(&endpoint)
                .header(CONTENT_TYPE, "application/json")
                .body(payload.to_string())
                .send()?;

            if !response.status().is_success() {
                anyhow::bail!(format!("{}: {}", response.status(), url));
            }

            let response = response.text()?;
            let response = serde_json::from_str::<FlareSolverrOutput>(&response)
                .with_context(|| anyhow::anyhow!("Parsing Flaresolverr response: {response}"))?;

            if response.solution.status != 200 {
                anyhow::bail!(format!(
                    "{}: {}",
                    response.solution.status, response.solution.url
                ));
            }

            Ok(response.solution.response.as_bytes().to_vec())
        })
        .join()
        .unwrap()?;

        Ok(bytes)
    }
}
