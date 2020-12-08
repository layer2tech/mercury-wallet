use wasm_bindgen::prelude::*;
use monotree::{
    hasher::{Blake3, Hasher},
    tree::verify_proof,
    Proof,
};
use std::convert::TryInto;


#[wasm_bindgen]
pub fn verify_statechain_smt(
    root: String,
    proof_key: String,
    proof: String,
) -> Result<JsValue, JsValue> {
    let root: Option<monotree::Hash> = match serde_json::from_str(&root) {
        Ok(val) => val,
        Err(err) => return Err(err.to_string().into())
    };

    let proof: Option<Proof> = match serde_json::from_str(&proof) {
        Ok(val) => val,
        Err(err) => return Err(err.to_string().into())
    };

    let entry: &monotree::Hash = proof_key[..32].as_bytes().try_into().unwrap();
    let hasher = Blake3::new();
    Ok(verify_proof(&hasher, root.as_ref(), &entry, proof.as_ref()).into())
}


use wasm_bindgen_test::*;

#[wasm_bindgen_test]
fn tester_trying() {
    println!("gothere");
}
