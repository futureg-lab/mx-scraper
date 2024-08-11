use serde::{Deserialize, Serialize};

use std::{collections::HashMap, str::FromStr};

use reqwest::{
    blocking::Client,
    blocking::Response,
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
pub fn fetch(url: Url) -> anyhow::Result<Response> {
    let context = {
        let config = GLOBAL_CONFIG.lock().unwrap();
        config.gen_fetch_context()
    };

    fetch_with_context(url, context)
}

/// Perform a fetch using a custom context
pub fn fetch_with_context(url: Url, context: FetchContext) -> anyhow::Result<Response> {
    let FetchContext {
        headers,
        cookies,
        auth,
    } = context;
    let client = Client::new();

    let mut req_headers = HeaderMap::new();
    for (k, v) in headers {
        req_headers.insert(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
    }
    req_headers.insert(
        COOKIE,
        HeaderValue::from_str(&NetscapeCookie::to_raw_string(&cookies))?,
    );

    let mut builder = client.get(url).headers(req_headers);
    if let Some(auth) = auth {
        builder = match auth {
            AuthKind::Basic { user, password } => builder.basic_auth(user, password),
            AuthKind::Bearer { token } => builder.bearer_auth(token),
        };
    }

    Ok(builder.send()?)
}
