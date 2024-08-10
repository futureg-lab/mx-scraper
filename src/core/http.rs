use serde::{Deserialize, Serialize};

use std::{collections::HashMap, str::FromStr};

use reqwest::{
    header::{HeaderMap, HeaderName, HeaderValue, COOKIE},
    Client, Response,
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
pub async fn fetch(url: Url) -> anyhow::Result<Response> {
    let FetchContext {
        headers,
        cookies,
        auth,
    } = {
        let config = GLOBAL_CONFIG.lock().unwrap();
        config.gen_fetch_context()
    };
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

    Ok(builder.send().await?)
}
