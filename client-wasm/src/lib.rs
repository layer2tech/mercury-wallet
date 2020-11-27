extern crate wasm_bindgen;
extern crate web_sys;
extern crate curv;
extern crate floating_duration;
extern crate reqwest;

#[macro_use]
extern crate serde_derive;
extern crate serde;
extern crate serde_json;

pub mod js_wrapper;
mod error;

use error::CError;

use serde::{Deserialize, Serialize};

pub type Result<T> = std::result::Result<T, CError>;
