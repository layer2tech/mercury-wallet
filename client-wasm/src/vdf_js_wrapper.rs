use wasm_bindgen::prelude::*;
use vdf::{VDFParams, WesolowskiVDFParams, VDF};
use hex::FromHex;
use hex::encode;

// secp256_k1::GE to bitcoin public key
#[wasm_bindgen]
pub fn solve_vdf_challenge(challenge: String) -> Result<JsValue, JsValue> {

    let decoded = <[u8; 32]>::from_hex(challenge).expect("Decoding failed");

    let vdf = WesolowskiVDFParams(2048 as u16).new();
    let solution = &vdf.solve(&decoded, 5000).unwrap()[..];

    Ok(encode(solution))
}
