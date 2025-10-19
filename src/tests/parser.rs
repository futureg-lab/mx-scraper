use crate::schemas::{default_on_null, liftvec_on_singleton};
use anyhow::Context;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[test]
fn coerce_default_if_null() {
    #[derive(Serialize, Deserialize)]
    struct Sample {
        #[serde(default, deserialize_with = "default_on_null")]
        field: String,
    }

    serde_json::from_value::<Sample>(json!({
        "field": null,
    }))
    .context("Explicit null")
    .unwrap();

    serde_json::from_value::<Sample>(json!({}))
        .context("Missing")
        .unwrap();
}

#[test]
fn lift_as_vec_if_singleton_basic() {
    #[derive(Serialize, Deserialize)]
    struct Sample {
        #[serde(default, deserialize_with = "liftvec_on_singleton")]
        field: Vec<String>,
    }

    serde_json::from_value::<Sample>(json!({
        "field": ["one", "two"],
    }))
    .context("Simple")
    .unwrap();

    serde_json::from_value::<Sample>(json!({
        "field": "singleton"
    }))
    .context("Complex")
    .unwrap();
}

#[test]
fn lift_as_vec_if_singleton_on_missing_or_null() {
    #[derive(Serialize, Deserialize)]
    struct Sample {
        #[serde(default, deserialize_with = "liftvec_on_singleton")]
        field: Vec<String>,
    }

    serde_json::from_value::<Sample>(json!({}))
        .context("Missing")
        .unwrap();

    serde_json::from_value::<Sample>(json!({
        "field": null,
    }))
    .context("Explicit null")
    .unwrap();
}
