extern crate wasm_bindgen;
extern crate web_sys;
extern crate curv;
extern crate floating_duration;

#[macro_use]
extern crate serde_derive;
extern crate serde;
extern crate serde_json;

pub mod kms_secp256k1_js_wrapper;
pub mod monotree_js_wrapper;
mod error;

use error::CError;

pub type Result<T> = std::result::Result<T, CError>;
