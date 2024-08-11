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

// ports from mx-scraper deno
// pub fn resume_text(s: &str, max: Option<usize>) -> String {
//     let max = max.unwrap_or(50);
//     if s.len() < max {
//         return s.to_string();
//     }

//     let delta = s.len() - max;
//     let chunk_end = s.len() / 2 - delta / 2;

//     format!("{} .. {}", &s[..chunk_end], &s[chunk_end + delta..])
// }
