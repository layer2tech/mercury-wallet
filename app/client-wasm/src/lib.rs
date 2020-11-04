extern crate wasm_bindgen;
extern crate curv;
extern crate web_sys;

use wasm_bindgen::prelude::*;
use curv::BigInt;
use web_sys::console;

// can call JS functions whose fn signatures are here
#[wasm_bindgen]
extern {
    pub fn alert(s: &str);
}

// Can be called by JS
#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}

#[wasm_bindgen]
pub fn call_curv_fn() {
    let bn = BigInt::from(3849938);
    console::log_1(&format!("Generate curv bn, {:?}!", bn).into());
}
