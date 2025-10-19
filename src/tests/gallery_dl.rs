use insta::assert_debug_snapshot;
use std::path::Path;

use crate::{
    plugins::{
        gallery_dl::{self, schema::Gallery, schema::GalleryItem, GalleryDLPlugin},
        MXPlugin,
    },
    schemas::book::Book,
};

fn materialize_book(file: &str) -> anyhow::Result<Book> {
    let file = Path::new("./src/tests/gallery_dl").join(file);
    let content = std::fs::read_to_string(file).unwrap();
    let output = serde_json::from_str::<Vec<GalleryItem>>(&content).unwrap();
    gallery_dl::generate_book("http://some.website/a/b/c".to_string(), output)
}

fn materialize_first_item(file: &str) -> anyhow::Result<Gallery> {
    let file = Path::new("./src/tests/gallery_dl").join(file);
    let content = std::fs::read(file.clone()).unwrap();
    serde_json::from_slice(&content).map_err(|e| anyhow::anyhow!("{file:?}: {e}"))
}

#[test]
fn parse_gallery_dl_first_item_nh() {
    materialize_first_item("first_item_nh.json").unwrap();
}

#[test]
fn parse_gallery_dl_first_item_km() {
    materialize_first_item("first_item_km.json").unwrap();
}

#[test]
fn parse_gallery_dl_generic_nh() {
    assert_debug_snapshot!(materialize_book("nh.json"));
}

#[test]
fn parse_gallery_dl_generic_km_1() {
    assert_debug_snapshot!(materialize_book("km_1.json"));
}

#[test]
fn parse_gallery_dl_generic_km_2() {
    assert_debug_snapshot!(materialize_book("km_2.json"));
}

#[test]
fn parse_gallery_dl_generic_tw_1() {
    assert_debug_snapshot!(materialize_book("tw_1.json"));
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
