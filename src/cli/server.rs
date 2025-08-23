use clap::Parser;
use reqwest::StatusCode;
use serde::Deserialize;
use std::{path::PathBuf, sync::Arc};

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
            max_size_init_crawl_batch: None,
            mini_batch_size: None,
            batch_size: None,
            listen_cookies: false,
        };

        let _ = {
            let mut config = GLOBAL_CONFIG.write().unwrap();
            config.adapt_override(flags.clone())?;
        };

        let result = { fetch_terms(terms, plugin).await? };

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

#[derive(Debug)]
pub struct OneshotHttpListener {
    pub port: u16,
}

#[handler]
async fn wait_handler(
    web::Json(payload): web::Json<serde_json::Value>,
    tx: web::Data<
        &Arc<tokio::sync::Mutex<Option<tokio::sync::oneshot::Sender<serde_json::Value>>>>,
    >,
) -> impl IntoResponse {
    tracing::debug!("Received payload {payload}");
    let mut tx = tx.lock().await;
    if let Some(tx) = tx.take() {
        tracing::debug!("Sending payload {payload}");

        return match tx.send(payload.clone()) {
            Ok(_) => Response::builder()
                .status(StatusCode::OK)
                .body(Body::from("Data received and processed.")),
            Err(e) => Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(format!(
                    "Data received but failed sending it: {}",
                    e.to_string()
                ))),
        };
    }

    tracing::warn!("Failed sending payload {payload}");
    Response::builder()
        .status(StatusCode::INTERNAL_SERVER_ERROR)
        .body(Body::from(format!(
            "Fatal: data received but unable to send signal from a potentially already used sender."
        )))
}

impl OneshotHttpListener {
    /// Waiting for `POST` request at `http://localhost:{port}/{callback}`
    pub async fn block_and_listen<O>(self, callback: &str) -> anyhow::Result<O>
    where
        O: for<'a> Deserialize<'a> + Sync + Send,
    {
        let port = self.port;
        let (tx, rx) = tokio::sync::oneshot::channel::<serde_json::Value>();
        let tx = Arc::new(tokio::sync::Mutex::new(Some(tx))); // Option hack
        let ret = Arc::new(tokio::sync::Mutex::new(None::<serde_json::Value>));
        let err = Arc::new(tokio::sync::Mutex::new(None::<String>));

        println!("Waiting for a callback http://localhost:{port}/{callback}");

        let ret_server = ret.clone();
        let err_server = err.clone();
        Server::new(TcpListener::bind(format!("0.0.0.0:{port}")))
            .run_with_graceful_shutdown(
                Route::new().at(format!("/{callback}"), post(wait_handler).data(tx)),
                async move {
                    tracing::debug!("oneshot server kill signal init");
                    match rx.await {
                        Ok(payload) => {
                            let mut ret = ret_server.lock().await;
                            *ret = Some(payload);
                        }
                        Err(e) => {
                            let mut err = err_server.lock().await;
                            *err = Some(e.to_string());
                        }
                    }
                },
                None,
            )
            .await?;

        let mut ret = ret.lock().await;
        if let Some(payload) = ret.take() {
            return serde_json::from_value::<O>(payload).map_err(|e| e.into());
        }

        let mut err = err.lock().await;
        if let Some(err) = err.take() {
            anyhow::bail!(err);
        }

        unreachable!("Invalid state: no response received yet no error was caught")
    }
}
