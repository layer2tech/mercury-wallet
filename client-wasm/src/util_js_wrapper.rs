use wasm_bindgen::prelude::*;
use web_sys::console;
use curv::{self, elliptic::curves::traits::ECPoint};

#[wasm_bindgen]
pub fn test_wasm() {
    console::log_1(&format!("console.log'ing from Rust.").into());
}

// secp256_k1::GE to bitcoin public key
#[wasm_bindgen]
pub fn curv_ge_to_bitcoin_public_key(pk: String) -> Result<JsValue, JsValue> {
    let pk: curv::elliptic::curves::secp256_k1::GE = match serde_json::from_str(&pk) {
        Ok(val) => val,
        Err(err) => return Err(err.to_string().into())
    };

    Ok(bitcoin::util::key::PublicKey {
        compressed: true,
        key: pk.get_element(),
    }.to_string().into())
}
