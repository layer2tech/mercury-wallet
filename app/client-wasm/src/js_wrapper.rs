use wasm_bindgen::prelude::*;
use curv::BigInt;
use web_sys::console;
use crate::{error::CError, requests::{self, ClientShim}};
use serde::{Deserialize, Serialize};

use serde_json::json;

// use crate::Result;

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

use curv::{elliptic::curves::traits::ECScalar, FE};
use curv::arithmetic::big_num::Num;
use kms::ecdsa::two_party::*;
use kms::ecdsa::two_party::party1::KeyGenParty1Message2;
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::*;
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_one::KeyGenFirstMsg;

#[wasm_bindgen]
pub struct KeyGen;

#[wasm_bindgen]
impl KeyGen {
    pub fn first_message(secret_key: String) -> Result<JsValue, JsValue> {
        let secret_key_bigint = match BigInt::from_str_radix(&secret_key, 16) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };

        let secret_key: FE = ECScalar::from(&secret_key_bigint);

        let (kg_party_two_first_message, kg_ec_key_pair_party2) =
        MasterKey2::key_gen_first_message_predefined(&secret_key);

        Ok(
            json!(
                {
                    "kg_party_two_first_message": serde_json::to_string(&kg_party_two_first_message).unwrap(),
                    "kg_ec_key_pair_party2": serde_json::to_string(&kg_ec_key_pair_party2).unwrap()
                }
            ).to_string().into()
        )
    }

    pub fn second_message(kg_party_one_first_message: String, kg_party_one_second_message: String) -> Result<JsValue, JsValue> {
        console::log_1(&format!("got here:").into());

        console::log_1(&format!("kg_party_one_first_message: {}", kg_party_one_first_message).into());
        console::log_1(&format!("kg_party_one_second_message: {}", kg_party_one_second_message).into());

        let msg1: KeyGenFirstMsg = match serde_json::from_str(&kg_party_one_first_message) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        console::log_1(&format!("msg1: {:?}", msg1).into());
        let msg2: KeyGenParty1Message2 = match serde_json::from_str(&kg_party_one_second_message) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        console::log_1(&format!("msg2: {:?}", msg2).into());

        let key_gen_second_message = MasterKey2::key_gen_second_message(
            &msg1,
            &msg2,
        );

        console::log_1(&format!("key_gen_second_message: {:?}", key_gen_second_message).into());


        Ok(JsValue::from("ff"))
    }
}
