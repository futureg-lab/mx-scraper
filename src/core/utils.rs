use regex::Regex;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use url::Url;

pub fn sanitize_string(s: &str) -> String {
    let s = decode_escaped_unicode_characters(s);
    let re = Regex::new(r#"[\\/:"'*?<>.\{\}|~+\n\t\r]+"#).unwrap();
    let parts = re.split(&s).collect::<Vec<&str>>();
    parts.join("_")
}

/// This handles the following cases:
/// 1. File names has to be trimmed on `windows`, will break explorer.exe otherwise
/// 2. File paths are limited to `255` characters on `windows` (non-unicode) \
///   To account for this, we trim it to `70` + `id` (optional) \
///   since manga titles can easily reach `255` in length alone.\
pub fn sanitize_string_as_path(s: &str, id: Option<String>) -> PathBuf {
    if let Some(id) = id {
        let sanitized = sanitize_string(s).trim().to_string();
        let shortened = unicode_safe_shorten(&sanitized, sanitized.len().min(70));
        PathBuf::from(format!("{shortened} ({id})"))
    } else {
        PathBuf::from(sanitize_string(s).trim())
    }
}

pub fn unicode_safe_shorten(text: &str, max_length: usize) -> String {
    let mut shortened = String::new();
    let mut length = 0;

    for ch in text.chars() {
        let char_length = ch.len_utf8();
        if length + char_length > max_length {
            break;
        }
        shortened.push(ch);
        length += char_length;
    }

    if length < text.len() {
        shortened.push_str("..");
    }

    shortened
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

/// A text may contain escaped unicode characters \
/// This can be annoying when dealing with file names infered from unsanatized \
/// escaped japanese/chinese/korean text for example, making everything unreadable
pub fn decode_escaped_unicode_characters(input: &str) -> String {
    let escaped = input.replace('"', "\\\"");
    let json_string = format!("\"{}\"", escaped);
    serde_json::from_str::<String>(&json_string)
        .expect("Failed to parse JSON string when attempting to decode escaped unicode")
}

pub fn compute_query_signature(term: &str, plugin_name: &str) -> String {
    let data = format!("{term}{plugin_name}");
    let digest = hex::encode(Sha256::digest(data));
    format!("mx_{digest}")
}

pub fn batch_a_list_of<T: Clone>(list: &[T], batch_size: usize) -> Vec<Vec<T>> {
    if batch_size == 0 {
        panic!("Batch size cannot be negative or 0");
    }

    let mut batches = Vec::new();
    let mut current_batch = Vec::new();
    let mut cursor = 0;

    while cursor < list.len() {
        current_batch.push(list[cursor].clone());
        cursor += 1;

        if current_batch.len() == batch_size {
            batches.push(current_batch);
            current_batch = Vec::new();
        }
    }

    if !current_batch.is_empty() {
        batches.push(current_batch);
    }

    batches
}

pub fn resume_text(s: &str, max: Option<usize>) -> String {
    let max = max.map(|v| v.max(1)).unwrap_or(50);
    let char_count = s.chars().count();

    if char_count <= max {
        return s.to_string();
    }

    let delta = char_count - max;
    let chunk_end = char_count / 2 - delta / 2;

    let start_chunk = s.chars().take(chunk_end).collect::<String>();
    let end_chunk = s.chars().skip(chunk_end + delta).collect::<String>();

    format!("{} .. {}", start_chunk, end_chunk)
}
