use serde::{de::DeserializeOwned, Deserialize, Deserializer};
use serde_json::Value;

pub mod book;
pub mod config;
pub mod cookies;

/// * `value => Vec<O>`
/// * `Array[.. values] => Vec<O>`
/// * Null => vec![] (Vec<O>)`
fn liftvec_singleton<'de, O>(value: serde_json::Value) -> anyhow::Result<Vec<O>>
where
    O: DeserializeOwned,
{
    match value {
        Value::Array(arr) => arr
            .into_iter()
            .map(serde_json::from_value)
            .collect::<Result<_, _>>(),
        Value::Null => Ok(vec![]),
        single => Ok(vec![serde_json::from_value(single)?]),
    }
    .map_err(|e| e.into())
}

/// * `null => vec![]`
/// * `0 => vec![0]`
/// * `"one" => vec!["one"]`
/// * `vec!["one"] => vec!["one"]`
pub fn liftvec_on_singleton<'de, D, O>(deserializer: D) -> Result<Vec<O>, D::Error>
where
    D: Deserializer<'de>,
    O: DeserializeOwned,
{
    let value = Value::deserialize(deserializer)?;

    liftvec_singleton::<O>(value.clone())
        .map_err(|e| serde::de::Error::custom(format!("Lifting on singleton {:?}: {e}", value)))
}

/// * `1 => Option("1")`
/// * `"two" => Option("two")`
pub fn coerce_as_opt_string_on_number<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    match value {
        Value::Number(num) => Ok(Some(num.to_string())),
        Value::String(s) => Ok(Some(s)),
        _ => Err(serde::de::Error::custom(format!(
            "Invalid type, string or number expected: {value:?}"
        ))),
    }
}

/// Alternative to `#[serde(default)]`
/// (only supports missing field but not explicit nulls)
///
/// Useful for loosening required fields requirements
/// * null => ""
/// * null => None
/// * null => 0
/// ..
pub fn default_on_null<'de, D, O>(deserializer: D) -> Result<O, D::Error>
where
    D: Deserializer<'de>,
    O: Default + DeserializeOwned,
{
    let value = Value::deserialize(deserializer)?;
    if value.is_null() {
        return Ok(Default::default());
    }
    serde_json::from_value(value).map_err(serde::de::Error::custom)
}
