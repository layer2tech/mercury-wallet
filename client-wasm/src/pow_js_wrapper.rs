use wasm_bindgen::prelude::*;
use sha3::Sha3_256;
use digest::Digest;
use hex;

const DIFFICULTY: usize = 4;

// solve the vdf challenge using wesolowski
#[wasm_bindgen]
pub fn solve_pow_challenge(challenge: String) -> Result<JsValue, JsValue> {

    let mut counter = 0;
    let zeros = String::from_utf8(vec![b'0'; DIFFICULTY]).unwrap();
    let mut hasher = Sha3_256::new();
    loop {
        hasher.input(&format!("{}:{:x}", challenge, counter).as_bytes());
        let result = hex::encode(hasher.result_reset());
        if result[..DIFFICULTY] == zeros {
            break;
        };
        counter += 1
    }

    let solution = format!("{:x}", counter);    

    Ok(solution.to_string().into())
}
