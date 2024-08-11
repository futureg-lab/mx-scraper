use std::{
    path::{Path, PathBuf},
    str::FromStr,
};

use crate::{
    core::http::{self},
    schemas::book::{Book, PluginOption, SearchOption},
    GLOBAL_CONFIG,
};
use anyhow::{bail, Context, Ok};
use pyo3::{exceptions::PyException, prelude::*, types::PyBytes};
use serde_pyobject::{from_pyobject, to_pyobject};
use url::Url;

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
            let mx_request = MxRequest;

            if plugin.hasattr("mx_get_urls")? {
                let res = plugin
                    .call_method1("mx_get_urls", (term.clone(), mx_request))
                    .with_context(|| {
                        format!("{}.mx_get_urls(term = {term:?}, ..)", self.name.clone())
                    })?;
                Book::from_raw_urls(from_pyobject(res)?)
            } else if plugin.hasattr("mx_get_book")? {
                match plugin.call_method1("mx_get_book", (term.clone(), mx_request)) {
                    Err(py_err) => {
                        bail!(
                            "{}.mx_get_book(term = {term:?}, ..): {py_err}",
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

#[pyclass]
#[derive(Debug)]
pub struct MxRequest;

macro_rules! can_throw_exception {
    ($e: expr) => {
        $e.map_err(|e| PyException::new_err(e.to_string()))?
    };
}

#[pymethods]
impl MxRequest {
    #[pyo3(signature = (url, context=None))]
    fn fetch(
        &self,
        py: Python,
        url: String,
        context: Option<Bound<PyAny>>,
    ) -> PyResult<Py<PyBytes>> {
        let url = can_throw_exception!(Url::from_str(&url));

        let bytes = can_throw_exception!(match context {
            Some(py_context) => {
                let context = from_pyobject(py_context)?;
                http::fetch_with_context(url, context)
            }
            None => http::fetch(url),
        });

        let bytes = PyBytes::new_bound(py, bytes.as_ref()).unbind();
        std::result::Result::Ok(bytes)
    }

    #[getter]
    pub fn context(&self, py: Python) -> Py<PyAny> {
        let context = {
            let config = GLOBAL_CONFIG.lock().unwrap();
            config.gen_fetch_context()
        };
        to_pyobject(py, &context).unwrap().unbind()
    }
}
