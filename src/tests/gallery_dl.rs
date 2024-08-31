use insta::assert_debug_snapshot;

use crate::plugins::{
    gallery_dl::{self, Gallery, GalleryDLPlugin, GalleryItem},
    MXPlugin,
};

// nh
#[test]
fn parse_gallery_dl_first_item_example_1() {
    let content =
        std::fs::read_to_string("./src/tests/gallery_dl/first_item_example_1.json").unwrap();
    serde_json::from_str::<Gallery>(&content).unwrap();
}

#[test]
fn parse_gallery_dl_generic_example_1() {
    let content = std::fs::read_to_string("./src/tests/gallery_dl/example_1.json").unwrap();
    serde_json::from_str::<Vec<GalleryItem>>(&content).unwrap();
}

// kem
#[test]
fn parse_gallery_dl_first_item_example_2() {
    let content =
        std::fs::read_to_string("./src/tests/gallery_dl/first_item_example_2.json").unwrap();
    serde_json::from_str::<Gallery>(&content).unwrap();
}

#[test]
fn parse_gallery_dl_generic_example_2() {
    let content = std::fs::read_to_string("./src/tests/gallery_dl/example_2.json").unwrap();
    serde_json::from_str::<Vec<GalleryItem>>(&content).unwrap();
}

// tw
#[test]
fn parse_gallery_dl_first_item_example_3() {
    let content =
        std::fs::read_to_string("./src/tests/gallery_dl/first_item_example_3.json").unwrap();
    let output = serde_json::from_str::<Vec<GalleryItem>>(&content).unwrap();
    let book = gallery_dl::generate_book("http://some.website/a/b/c".to_string(), output).unwrap();
    assert_debug_snapshot!(book);
}

#[tokio::test]
async fn fetch_book() {
    let mut plugin = GalleryDLPlugin::new();

    let term = "https://twitter.com/imigimuru/status/1829913427373953259".to_string();

    plugin.init().await.unwrap();

    if !plugin.is_supported(term.clone()).await.unwrap() {
        panic!("Sauce {term:?} not supported?");
    }

    plugin.get_book(term).await.unwrap();
}
