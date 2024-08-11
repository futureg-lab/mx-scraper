use regex::Regex;
use std::path::PathBuf;
use url::Url;

pub fn sanitize_string(s: &str) -> String {
    let re = Regex::new(r#"[\\/:"'*?<>.\{\}|~+\n\t\r]+"#).unwrap();
    let parts = re.split(s).collect::<Vec<&str>>();
    parts.join("_")
}

pub fn sanitize_string_as_path(s: &str) -> PathBuf {
    PathBuf::from(sanitize_string(s))
}

pub fn extract_filename(url: &Url) -> Option<String> {
    match url.path_segments().unwrap().last() {
        Some(name) => match urlencoding::decode(name) {
            Ok(decoded) => Some(decoded.to_string()),
            Err(_) => None, // we don't care if it fails
        },
        None => None,
    }
}
