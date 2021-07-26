use wasm_bindgen::prelude::*;
use vdf::{VDFParams, WesolowskiVDFParams, VDF};
use hex::FromHex;
use hex::encode;

const DIFFICULTY: u64 = 5000;

// solve the vdf challenge using wesolowski
#[wasm_bindgen]
pub fn solve_vdf_challenge(challenge: String) -> Result<JsValue, JsValue> {

    let decoded = <[u8; 32]>::from_hex(challenge).expect("Decoding failed");

    let vdf = WesolowskiVDFParams(2048 as u16).new();
    let solution = &vdf.solve(&decoded, DIFFICULTY).unwrap()[..];

    Ok(encode(solution).into())
}
