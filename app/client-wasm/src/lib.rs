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

#[wasm_bindgen]
pub fn get_se_fees() {
    console::log_1(&"Get fees Rust fn called.".into());
}

#[wasm_bindgen]
pub fn get_statechain() {
    console::log_1(&"Get statechain Rust fn called.".into());
}

#[wasm_bindgen]
pub fn gen_btc_addr() {
    console::log_1(&"Generate Bitcoin Address Rust fn called.".into());
}

#[wasm_bindgen]
pub fn gen_se_addr() {
    console::log_1(&"Generate StateEntity Address Rust fn called.".into());
}

#[wasm_bindgen]
pub fn deposit() {
    console::log_1(&"Deposit Rust fn called.".into());
}

#[wasm_bindgen]
pub fn transfer_sender() {
    console::log_1(&"Transfer_sender Rust fn called.".into());
}

#[wasm_bindgen]
pub fn transfer_receiver() {
    console::log_1(&"Transfer_receiver Rust fn called.".into());
}

#[wasm_bindgen]
pub fn withdraw() {
    console::log_1(&"Withdraw Rust fn called.".into());
}

#[wasm_bindgen]
pub fn swap() {
    console::log_1(&"Swap Rust fn called.".into());
}
