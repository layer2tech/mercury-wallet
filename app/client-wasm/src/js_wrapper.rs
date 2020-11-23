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
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_one::KeyGenFirstMsg;
use std::collections::HashMap;
use serde_json::Value;


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

        console::log_1(&format!("kg_party_one_first_message: {:?}", kg_party_one_first_message).into());
        let mut msg1 = convert_big_int_serialization(&kg_party_one_first_message, "pk_commitment".to_string());
        console::log_1(&format!("msg1: {:?}", msg1).into());
        msg1 = convert_big_int_serialization(&msg1, "zk_pok_commitment".to_string());
        console::log_1(&format!("msg1: {:?}", msg1).into());

        let msg1 = serde_json::from_str::<KeyGenFirstMsg>(&msg1).unwrap();
        console::log_1(&format!("msg1: {:?}", msg1).into());


        console::log_1(&format!("kg_party_one_second_message: {:?}", kg_party_one_second_message).into());
        let msg2 = convert_big_int_serialization(&kg_party_one_second_message, "c_key".to_string());
        console::log_1(&format!("msg2: {:?}", msg2).into());

        let msg2: KeyGenParty1Message2 = match serde_json::from_str(&msg2) {
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

pub fn convert_big_int_serialization(json_str: &String, field_name: String) -> String {
    let mut json: HashMap<String, Value> =
        serde_json::from_str(json_str).expect("unable to parse JSON");

    let big_int_str = json[&field_name].as_str().ok_or(format!("None or invalid type at field {:?}", field_name)).unwrap();
    let big_int = BigInt::from_str_radix(big_int_str, 16).unwrap();

    json.insert(field_name, serde_json::to_value(&big_int).unwrap());

    serde_json::to_string(&json).unwrap()
}

/// specialised fn for taking apart serialized KeyGenParty1Message2 and converting BigInt types
pub fn convert_big_int_serializations_key_gen_party1_msg_2(json_str: &String) -> String {
    // convert c_key
    let json_str = convert_big_int_serialization(json_str, "c_key".to_string());

    // translate str to key -> item hashmap
    let mut json: HashMap<String, Value> =
        serde_json::from_str(&json_str).expect("unable to parse JSON");

    // pull out ecdh_second_message object and translate to key -> item hashmap
    let field_ecdh_second_message = "ecdh_second_message".to_string();
    let ecdh_second_message_obj = json[&field_ecdh_second_message].as_object()
        .ok_or(format!("None or invalid type at field {:?}", field_ecdh_second_message)).unwrap();
    let ecdh_second_message_str = serde_json::to_string(&ecdh_second_message_obj).unwrap();

    let mut ecdh_second_message_json: HashMap<String, Value> =
        serde_json::from_str(&ecdh_second_message_str).expect("unable to parse JSON");

    // pull out comm_witness
    let comm_witness_field = "comm_witness".to_string();
    let comm_witness_obj = ecdh_second_message_json[&comm_witness_field].as_object()
        .ok_or(format!("None or invalid type at comm_witness_field {:?}", comm_witness_field)).unwrap();
    let comm_witness_str = serde_json::to_string(&comm_witness_obj).unwrap();

    // convert bigints pk_commitment_blind_factor and zk_pok_blind_factor
    let comm_witness_str = &convert_big_int_serialization(&comm_witness_str.to_string(), "pk_commitment_blind_factor".to_string());
    let comm_witness_str = &convert_big_int_serialization(&comm_witness_str.to_string(), "zk_pok_blind_factor".to_string());

    // Insert back into ecdh_second_message Object
    let comm_witness_json: HashMap<String, Value> =
        serde_json::from_str(&comm_witness_str).expect("unable to parse JSON");
    ecdh_second_message_json.insert(comm_witness_field, serde_json::to_value(&comm_witness_json).unwrap());

    // Insert ecdh_second_message back into full Json Object
    json.insert(field_ecdh_second_message, serde_json::to_value(&ecdh_second_message_json).unwrap());

    serde_json::to_string(&json).unwrap()
}
