extern crate wasm_bindgen;
extern crate web_sys;
extern crate curv;
extern crate floating_duration;

#[macro_use]
extern crate serde_derive;
extern crate serde;
extern crate serde_json;
extern crate rand;
extern crate uuid;
extern crate schemars;
extern crate rocket_okapi;
extern crate bitcoin;
extern crate bitcoin_hashes;
//extern crate mercury_shared;

pub mod kms_secp256k1_js_wrapper;
pub mod swap_js_wrapper;
pub mod monotree_js_wrapper;
pub mod util_js_wrapper;
mod error;

use error::CError;

pub type Result<T> = std::result::Result<T, CError>;


use wasm_bindgen::prelude::*;
extern crate console_error_panic_hook;

#[wasm_bindgen]
pub fn init() {
    // Return rust error trace to javascript upon panic
    console_error_panic_hook::set_once();
}
