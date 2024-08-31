use serde::{de::DeserializeOwned, Deserialize, Deserializer};
use serde_json::Value;

pub mod book;
pub mod config;
pub mod cookies;

pub fn deserialize_singleton<'de, D, O>(deserializer: D) -> Result<Vec<O>, D::Error>
where
    D: Deserializer<'de>,
    O: DeserializeOwned,
{
    let value = Value::deserialize(deserializer)?;
    let oify = |value: Value| serde_json::from_value(value).map_err(serde::de::Error::custom);

    match value {
        Value::Array(arr) => arr.into_iter().map(oify).collect::<Result<_, _>>(),
        single => Ok(vec![oify(single)?]),
    }
}

pub fn deserialize_coerce_num_as_opt_string<'de, D>(
    deserializer: D,
) -> Result<Option<String>, D::Error>
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
