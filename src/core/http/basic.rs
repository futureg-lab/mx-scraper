use crate::{
    core::http::{ContextProvider, MxScraperHttpResolver},
    schemas::config::AuthKind,
};
use reqwest::{
    blocking::{self},
    redirect::Policy,
    Client,
};
use url::Url;

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
