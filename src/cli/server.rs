use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug)]
pub struct ApiServer {
    /// Server port
    #[arg(long)]
    port: Option<u16>,
}

use crate::{plugins::FetchResult, GLOBAL_CONFIG, PLUGIN_MANAGER};
use async_graphql::{
    http::GraphiQLSource, EmptyMutation, EmptySubscription, Object, Schema, SimpleObject, Union,
};
use async_graphql_poem::*;
use poem::{listener::TcpListener, web::Html, *};

use super::fetch::{fetch_terms, Auth, Resolution, SharedFetchOption};

#[derive(SimpleObject)]
struct FetchError {
    error: String,
}

#[derive(Union)]
enum CrawlResult {
    Resolved(FetchResult),
    Failed(FetchError),
}

#[derive(SimpleObject)]
struct CrawlOuput {
    term: String,
    result: CrawlResult,
}

struct Query;

#[Object]
impl Query {
    async fn crawl(
        &self,
        terms: Vec<String>,
        plugin: Option<String>,
        no_cache: Option<bool>,
        cookies_path: Option<String>,
        auth: Option<Auth>,
        max_parallel_fetch: Option<usize>,
    ) -> anyhow::Result<Vec<CrawlOuput>> {
        let flags = SharedFetchOption {
            plugin: plugin.clone(),
            no_cache: no_cache.unwrap_or(false),
            cookies: cookies_path.map(PathBuf::from),
            auth,
            verbose: true,
            meta_only: true,          // no effect
            custom_downloader: false, // no effect
            rand: false,
            asc: false,
            reflect: false,
            max_parallel_fetch,
            mini_batch_size: None,
            batch_size: None,
        };

        let _ = {
            let mut config = GLOBAL_CONFIG.write().unwrap();
            config.adapt_override(flags.clone())?;
        };

        let result = {
            let mut manager = PLUGIN_MANAGER.write().await;
            fetch_terms(&terms, &mut manager, plugin).await
        };

        Ok(result
            .iter()
            .map(|(term, res)| CrawlOuput {
                term: term.to_owned(),
                result: match res {
                    Resolution::Success(fetch_result) => {
                        CrawlResult::Resolved(fetch_result.to_owned())
                    }
                    Resolution::Fail(error) => CrawlResult::Failed(FetchError {
                        error: error.to_string(),
                    }),
                },
            })
            .collect())
    }

    async fn plugin_list(&self) -> Vec<String> {
        let manager = PLUGIN_MANAGER.write().await;
        manager.list_plugins()
    }
}

#[handler]
async fn playground() -> impl IntoResponse {
    Html(GraphiQLSource::build().finish())
}

impl ApiServer {
    pub async fn spawn(&self) -> anyhow::Result<()> {
        let schema = Schema::build(Query, EmptyMutation, EmptySubscription).finish();

        let app = Route::new().at("/", get(playground).post(GraphQL::new(schema)));
        let port = self.port.unwrap_or(8000);
        println!("Playground: http://localhost:{port}");

        Server::new(TcpListener::bind(format!("0.0.0.0:{port}")))
            .run(app)
            .await?;

        Ok(())
    }
}
