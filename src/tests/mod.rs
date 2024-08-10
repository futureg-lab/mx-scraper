#[cfg(test)]
mod test {
    use std::path::PathBuf;

    use crate::plugins::python::PythonPlugin;
    use crate::plugins::MXPlugin;
    use crate::schemas::book::Book;

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

        if let Err(e) = plugin.get_book(term).await {
            panic!("{e}");
        }
    }
}
