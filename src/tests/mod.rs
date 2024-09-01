#[cfg(test)]
mod gallery_dl;

#[cfg(test)]
mod parser;

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
        let content = std::fs::read_to_string("./src/tests/old_book.json").unwrap();
        serde_json::from_str::<Book>(&content).unwrap();
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

    #[tokio::test]
    async fn fetch_async_and_sync_have_the_same_output() {
        let example = Url::from_str("http://example.com").unwrap();
        let bytes_a = http::fetch(example.clone()).unwrap();
        let bytes_b = http::fetch_async(example.clone()).await.unwrap();
        assert_eq!(bytes_a, bytes_b)
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

    #[test]
    fn utils_resume_text() {
        let abc = "aaaaaaaaaa^^^^^^^bbbbbbbbb";
        assert_eq!(
            "aaaaaaaaaa^ .. ^bbbbbbbbb",
            utils::resume_text(abc, Some(21))
        );
        assert_eq!("aa .. b", utils::resume_text(abc, Some(3)));
        assert_eq!("a .. ", utils::resume_text(abc, Some(1)));
        assert_eq!("a .. ", utils::resume_text(abc, Some(0)));
        assert_eq!("aaaaaaaaaa^^^^^^^bbbbbbbbb", utils::resume_text(abc, None));
        assert_eq!(
            "aaaaaaaaaa^^^^^^^bbbbbbbbb",
            utils::resume_text(abc, Some(100000))
        );
        assert_eq!(
            "サイン .. こす",
            utils::resume_text("サインこす aaaaaaa草🗿aabbbこす", Some(5))
        );
    }

    #[test]
    fn utils_decode_escaped_unicode_properly() {
        let title = "\\u30d1\\u30f3%tsu";
        let decoded = utils::decode_escaped_unicode_characters(&title);
        assert_eq!(decoded, "パン%tsu");
    }

    #[test]
    fn utils_sanitize_folder_name() {
        let cleaned = utils::sanitize_string_as_path(
            "  folder:\"*?*.name~/ \\u3084\\u3070\\u3044\\u30BF\\u30A4\\u30C8\\u30EB '' ",
            Some("mx_1234".to_string()),
        );

        assert_eq!(
            cleaned.display().to_string(),
            "folder_name_ やばいタイトル _ (mx_1234)"
        );
    }
}
