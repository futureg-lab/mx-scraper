#[cfg(test)]
mod test {
    use std::path::PathBuf;
    use std::str::FromStr;

    use url::Url;

    use crate::core::{http, utils};
    use crate::plugins::python::PythonPlugin;
    use crate::plugins::MXPlugin;
    use crate::schemas::book::Book;
    use crate::schemas::cookies::NetscapeCookie;

    #[test]
    fn should_work_with_old_books() {
        match std::fs::read_to_string("./src/tests/old_book.json") {
            Ok(content) => {
                let book = serde_json::from_str::<Book>(&content);
                assert!(book.is_ok());
            }
            Err(e) => panic!("File not found: {e}"),
        }
    }

    #[tokio::test]
    async fn python_foreign_function_mx_get_book() {
        let mut plugin = PythonPlugin {
            name: "example".to_string(),
            workdir: Some(PathBuf::from("src/tests/plugins")),
        };

        let term = "https://some-sauce/a/b/c".to_string();

        plugin.init().await.unwrap();
        if !plugin.is_supported(term.clone()).await.unwrap() {
            panic!("Sauce {term:?} not supported?");
        }

        plugin.get_book(term).await.unwrap();
    }

    #[test]
    fn perform_fetch_using_config_as_context() {
        let example = Url::from_str("http://example.com").unwrap();
        let _bytes = http::fetch(example).unwrap();
    }

    #[test]
    fn parse_netscape_cookies_formatted_in_json() {
        let json = std::fs::read_to_string("src/tests/cookies/netscape.json").unwrap();
        let res = NetscapeCookie::from_json(&json).unwrap();
        assert_eq!(res.len(), 3);
    }

    #[test]
    fn parse_basic_kv_cookies_formatted_in_json() {
        let json = std::fs::read_to_string("src/tests/cookies/basic_kv.json").unwrap();
        let res = NetscapeCookie::from_json(&json).unwrap();
        assert_eq!(res.len(), 2);
    }

    #[test]
    fn utils_batch_a_list() {
        let items = (0..10).collect::<Vec<_>>();
        let sub_sizes = utils::batch_a_list_of(&items, 3)
            .iter()
            .map(|v| v.len())
            .collect::<Vec<_>>();
        assert_eq!(sub_sizes, vec![3, 3, 3, 1]);
    }
}
