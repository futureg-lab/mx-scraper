use serde::{Deserialize, Serialize};

use std::{collections::HashMap, str::FromStr};

use reqwest::{
    blocking::Client,
    header::{HeaderMap, HeaderName, HeaderValue, COOKIE},
};

use url::Url;

use crate::{
    schemas::{config::AuthKind, cookies::NetscapeCookie},
    GLOBAL_CONFIG,
};

#[derive(Default, Serialize, Deserialize, Clone)]
pub struct FetchContext {
    pub headers: HashMap<String, String>,
    pub cookies: Vec<NetscapeCookie>,
    pub auth: Option<AuthKind>,
}

/// Perform a fetch using the global config as context
pub fn fetch(url: Url) -> anyhow::Result<Vec<u8>> {
    let context = {
        let config = GLOBAL_CONFIG.lock().unwrap();
        config.gen_fetch_context()
    };

    fetch_with_context(url, context)
}

/// Perform a fetch using a custom context
pub fn fetch_with_context(url: Url, context: FetchContext) -> anyhow::Result<Vec<u8>> {
    let FetchContext {
        headers,
        cookies,
        auth,
    } = context;

    let mut req_headers = HeaderMap::new();
    for (k, v) in headers {
        req_headers.insert(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
    }
    req_headers.insert(
        COOKIE,
        HeaderValue::from_str(&NetscapeCookie::to_raw_string(&cookies))?,
    );

    // FIXME:
    // reqwest::blocking acting sus
    // "Cannot drop a runtime in a context where blocking is not allowed"
    // throwing it into another thread solves the issue
    let bytes = std::thread::spawn(move || {
        let client = Client::new();
        let mut builder = client.get(url.clone()).headers(req_headers);
        if let Some(auth) = auth {
            builder = match auth {
                AuthKind::Basic { user, password } => builder.basic_auth(user, password),
                AuthKind::Bearer { token } => builder.bearer_auth(token),
            };
        }
        let response = builder.send()?;
        if !response.status().is_success() {
            anyhow::bail!(format!("{}: {url}", response.status()));
        } else {
            Ok(response.bytes()?)
        }
    })
    .join()
    .unwrap()?;

    Ok(bytes.to_vec())
}
