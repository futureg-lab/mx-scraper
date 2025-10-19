use crate::{
    core::http::{ContextProvider, MxScraperHttpResolver},
    schemas::cookies::NetscapeCookie,
};
use anyhow::Context;
use indexmap::IndexMap;
use reqwest::{
    blocking::{self},
    header::{HeaderValue, AUTHORIZATION, CONTENT_TYPE},
    Client,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use url::Url;

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct FlareSolverrResolver {
    pub endpoint: Url,
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
                headers.insert(k.to_string(), HeaderValue::from_str(v)?);
            }

            if let Some(auth) = &ctx.auth {
                headers.insert(
                    AUTHORIZATION.to_string(),
                    HeaderValue::from_str(&auth.stringify())?,
                );
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
    url: Url,
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
    fn can_download(&self) -> bool {
        false
    }

    async fn get_async(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        let payload = self.create_payload(&url, &context)?;
        tracing::debug!("async: payload {payload}");
        let client = Client::new();
        let response = client
            .post(self.endpoint.to_string())
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
        let endpoint = self.endpoint.to_string();
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
