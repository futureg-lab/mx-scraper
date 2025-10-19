use crate::core::http::{basic::BasicRequestResolver, ContextProvider, MxScraperHttpResolver};
use serde::{Deserialize, Serialize};
use url::Url;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CloudflareWorkerResolver {
    worker_url: Url,
}

impl CloudflareWorkerResolver {
    pub fn actual_url(&self, url: Url) -> Url {
        let mut proxy = self.worker_url.clone();
        proxy.query_pairs_mut().append_pair("url", url.as_ref());
        proxy
    }
}

#[async_trait::async_trait]
impl MxScraperHttpResolver for CloudflareWorkerResolver {
    fn get(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        BasicRequestResolver.get(self.actual_url(url), context)
    }

    async fn get_async(&self, url: Url, context: ContextProvider) -> anyhow::Result<Vec<u8>> {
        BasicRequestResolver
            .get_async(self.actual_url(url), context)
            .await
    }
}
