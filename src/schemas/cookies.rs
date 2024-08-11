use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct NetscapeCookie {
    pub expiration_date: Option<f64>,
    pub host_only: Option<bool>,
    pub http_only: Option<bool>,
    pub same_site: Option<String>,
    pub secure: Option<bool>,
    pub session: Option<bool>,
    pub store_id: Option<String>,
    // normally required
    pub path: Option<String>,
    pub domain: Option<String>,
    // headers only
    pub name: String,
    pub value: String,
}

impl NetscapeCookie {
    pub fn from_json(json: &str) -> anyhow::Result<Vec<NetscapeCookie>> {
        if let Ok(res) = NetscapeCookie::from_key_value_json(json) {
            return Ok(res);
        }
        NetscapeCookie::from_netscape_json(json)
    }

    pub fn from_netscape_json(json: &str) -> anyhow::Result<Vec<NetscapeCookie>> {
        if let Ok(value) = serde_json::from_str::<Vec<NetscapeCookie>>(json) {
            return Ok(value);
        }
        Ok(vec![serde_json::from_str::<NetscapeCookie>(json)?])
    }

    pub fn from_key_value_json(json: &str) -> anyhow::Result<Vec<NetscapeCookie>> {
        let kv: HashMap<String, String> = serde_json::from_str(json)?;
        Ok(Self::from_hashmap(&kv))
    }

    pub fn from_hashmap(m: &HashMap<String, String>) -> Vec<NetscapeCookie> {
        let mut res = vec![];
        for (k, v) in m {
            res.push(NetscapeCookie {
                name: k.to_string(),
                value: v.to_string(),
                ..Default::default()
            });
        }
        res
    }

    /// Convert into any map, ignore domain constraint and may override common keys
    /// as this will naively collect the entries.
    pub fn to_map<M>(cookies: &[NetscapeCookie]) -> M
    where
        M: FromIterator<(String, String)>,
    {
        cookies
            .iter()
            .map(|cookie| (cookie.name.clone(), cookie.value.clone()))
            .collect()
    }

    /// Format k1=v1; k2=v2; ..
    pub fn to_raw_string(cookies: &[NetscapeCookie]) -> String {
        cookies
            .iter()
            .map(|cookie| format!("{}={}", cookie.name, cookie.value))
            .collect::<Vec<_>>()
            .join("; ")
    }
}
