use std::path::{Path, PathBuf};

use crate::schemas::book::{Book, PluginOption, SearchOption};
use anyhow::{bail, Context, Ok};
use pyo3::prelude::*;
use serde_pyobject::from_pyobject;

use super::MXPlugin;

#[derive(Debug)]
pub struct PythonPlugin {
    pub name: String,
    pub workdir: Option<PathBuf>,
}

impl MXPlugin for PythonPlugin {
    async fn init(&mut self) -> anyhow::Result<()> {
        if self.name.split_whitespace().count() > 1 {
            bail!(
                "Invalid {:?}: plugin name cannot contain whitespaces",
                self.name
            )
        }

        if self.workdir.is_none() {
            self.workdir = Some(Path::new("./plugins").canonicalize()?);
        }

        std::env::set_var("PYTHONPATH", self.workdir.clone().unwrap());

        Ok(())
    }

    async fn destroy(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    fn configure(&mut self, _option: PluginOption) -> anyhow::Result<()> {
        Ok(())
    }

    async fn get_book(&self, term: String) -> anyhow::Result<Book> {
        pyo3::prepare_freethreaded_python();
        Python::with_gil(|py| {
            let name: &str = self.name.as_ref();
            let plugin = py.import_bound(name)?;

            if plugin.hasattr("mx_get_urls")? {
                let res = plugin
                    .call_method1("mx_get_urls", (term.clone(),))
                    .with_context(|| format!("Calling mx_get_urls with term {term:?}"))?;
                Book::from_raw_urls(from_pyobject(res)?)
            } else if plugin.hasattr("mx_get_book")? {
                match plugin.call_method1("mx_get_book", (term.clone(),)) {
                    Err(py_err) => {
                        bail!(
                            "{}.mx_get_book(term = {term:?}): {py_err}",
                            self.name.clone()
                        )
                    }
                    other => {
                        let other = other?;
                        from_pyobject(other.clone())
                            .with_context(|| format!("Deserializing {:?}", other))
                    }
                }
            } else {
                bail!("Invalid could not find mx_get_urls(term) or mx_get_book(term)",)
            }
        })
    }

    async fn search(&self, _term: String, _option: SearchOption) -> anyhow::Result<Vec<Book>> {
        unimplemented!()
    }

    async fn is_supported(&self, term: String) -> anyhow::Result<bool> {
        pyo3::prepare_freethreaded_python();
        Python::with_gil(|py| {
            let name: &str = self.name.as_ref();
            let plugin = py.import_bound(name)?;
            let res = plugin
                .call_method1("mx_is_supported", (term.clone(),))
                .with_context(|| format!("Calling mx_is_supported with term {term:?}"))?;
            res.extract()
                .with_context(|| format!("mx_is_supported returned {res:?} but bool was expected",))
        })
    }
}
