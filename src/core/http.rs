use serde::{Deserialize, Serialize};

use std::{collections::HashMap, str::FromStr};

use reqwest::{
    blocking::{self},
    header::{HeaderMap, HeaderName, HeaderValue, COOKIE, USER_AGENT},
    redirect::Policy,
    Client,
};

use url::Url;

use crate::{
    schemas::{config::AuthKind, cookies::NetscapeCookie},
    GLOBAL_CONFIG,
};

macro_rules! build_client_then_fetch {
    // TODO: refactor
    (false, $url: expr, $headers: expr, $auth: expr) => {{
        let client = blocking::Client::builder()
            .redirect(Policy::limited(5))
            .build()?;
        let mut builder = client.get($url.clone()).headers($headers);
        if let Some(auth) = $auth {
            builder = match auth {
                AuthKind::Basic { user, password } => builder.basic_auth(user, password),
                AuthKind::Bearer { token } => builder.bearer_auth(token),
            };
        }
        let response = builder.send()?;
        if !response.status().is_success() {
            anyhow::bail!(format!("{}: {}", response.status(), $url));
        } else {
            Ok(response.bytes()?)
        }
    }};
    (true, $url: expr, $headers: expr, $auth: expr) => {
        async {
            let client = Client::builder().redirect(Policy::limited(5)).build()?;
            let mut builder = client.get($url.clone()).headers($headers);
            if let Some(auth) = $auth {
                builder = match auth {
                    AuthKind::Basic { user, password } => builder.basic_auth(user, password),
                    AuthKind::Bearer { token } => builder.bearer_auth(token),
                };
            }
            let response = builder.send().await?;
            if !response.status().is_success() {
                anyhow::bail!(format!("{}: {}", response.status(), $url));
            } else {
                Ok(response.bytes().await?)
            }
        }
    };
}

#[derive(Default, Debug, Serialize, Deserialize, Clone)]
pub struct FetchContext {
    pub user_agent: Option<String>,
    pub headers: HashMap<String, String>,
    pub cookies: Vec<NetscapeCookie>,
    pub auth: Option<AuthKind>,
}

/// Perform a fetch using the global config as context
pub fn fetch(url: Url) -> anyhow::Result<Vec<u8>> {
    let context = {
        let config = GLOBAL_CONFIG.read().unwrap();
        config.gen_fetch_context()
    };

    fetch_with_context(url, context)
}

/// Perform a fetch using a custom context
pub fn fetch_with_context(url: Url, context: FetchContext) -> anyhow::Result<Vec<u8>> {
    let FetchContext {
        user_agent,
        headers,
        cookies,
        auth,
    } = context;

    let mut req_headers = HeaderMap::new();
    if let Some(ua) = user_agent {
        req_headers.insert(USER_AGENT, HeaderValue::from_str(&ua)?);
    }

    for (k, v) in headers {
        req_headers.insert(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
    }
    req_headers.insert(
        COOKIE,
        HeaderValue::from_str(&NetscapeCookie::to_raw_string(&cookies))?,
    );

    let bytes = std::thread::spawn(move || {
        // FIXME:
        // reqwest::blocking acting sus
        // "Cannot drop a runtime in a context where blocking is not allowed"
        // throwing it into another thread solves the issue
        build_client_then_fetch!(false, url, req_headers, auth)
    })
    .join()
    .unwrap()?;

    Ok(bytes.to_vec())
}

/// Perform a fetch using the global config as context
pub async fn fetch_async(url: Url) -> anyhow::Result<Vec<u8>> {
    let context = {
        let config = GLOBAL_CONFIG.read().unwrap();
        config.gen_fetch_context()
    };

    fetch_with_context_async(url, context).await
}

/// Perform a fetch using a custom context
pub async fn fetch_with_context_async(url: Url, context: FetchContext) -> anyhow::Result<Vec<u8>> {
    let FetchContext {
        user_agent,
        headers,
        cookies,
        auth,
    } = context;

    let mut req_headers = HeaderMap::new();
    if let Some(ua) = user_agent {
        req_headers.insert(USER_AGENT, HeaderValue::from_str(&ua)?);
    }

    for (k, v) in headers {
        req_headers.insert(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
    }
    req_headers.insert(
        COOKIE,
        HeaderValue::from_str(&NetscapeCookie::to_raw_string(&cookies))?,
    );

    let bytes = build_client_then_fetch!(true, url, req_headers, auth).await?;

    Ok(bytes.to_vec())
}
