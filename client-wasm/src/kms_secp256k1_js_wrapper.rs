use wasm_bindgen::prelude::*;

use serde_json::{json, Value};
use curv::{elliptic::curves::traits::ECScalar, FE, GE, BigInt};
use curv::arithmetic::big_num::Num;
use kms::ecdsa::two_party::MasterKey2;
use kms::ecdsa::two_party::party1::KeyGenParty1Message2;
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::{PaillierPublic, EphCommWitness, EcKeyPair, EphEcKeyPair};
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_one::{EphKeyGenFirstMsg, KeyGenFirstMsg};
use std::collections::HashMap;

/// Provides wrappers for kms-secp256k1 MasterKey2 KeyGen methods
#[wasm_bindgen]
pub struct KeyGen;

#[wasm_bindgen]
impl KeyGen {
    pub fn first_message(secret_key: String) -> Result<JsValue, JsValue> {

        // Convert into Rust FE type
        let secret_key_bigint = match BigInt::from_str_radix(&secret_key, 16) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        let secret_key: FE = ECScalar::from(&secret_key_bigint);

        // Run Rust kms-secp256k1 method
        let (kg_party_two_first_message, kg_ec_key_pair_party2) =
            MasterKey2::key_gen_first_message_predefined(&secret_key);

        // convert to strings and place into JSON for return to JS
        Ok(
            json!(
                {
                    "kg_party_two_first_message": kg_party_two_first_message,
                    "kg_ec_key_pair_party2": kg_ec_key_pair_party2
                }
            ).to_string().into()
        )
    }

    pub fn second_message(kg_party_one_first_message: String, kg_party_one_second_message: String) -> Result<JsValue, JsValue> {
        // Convert messages's BigInts into correct serialization format
        let mut kg_party_one_first_message = convert_big_int_to_client_deserializable(&kg_party_one_first_message, "pk_commitment".to_string());

        kg_party_one_first_message = convert_big_int_to_client_deserializable(&kg_party_one_first_message, "zk_pok_commitment".to_string());

        // Deserialize into Rust type
        let kg_party_one_first_message = match serde_json::from_str::<KeyGenFirstMsg>(&kg_party_one_first_message) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };

        // Convert messages's BigInts into correct serialization format
        let kg_party_one_second_message = convert_key_gen_party1_msg_2_to_client_deserializable(&kg_party_one_second_message);

        // Deserialize into Rust type
        let kg_party_one_second_message: KeyGenParty1Message2 = match serde_json::from_str(&kg_party_one_second_message) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };

        // Run Rust kms-secp256k1 method
        let key_gen_second_message
            =  match MasterKey2::key_gen_second_message(
                &kg_party_one_first_message,
                &kg_party_one_second_message,
            ) {
            Ok(val) => val,
            Err(_) => return Err("key_gen_second_message panic.".into())
        };
        let (_, party_two_paillier) = key_gen_second_message;

        // convert to strings and place into JSON for return to JS
        Ok(
            json!(
                {
                    "party_two_paillier": party_two_paillier
                }
            ).to_string().into()
        )
    }

    pub fn set_master_key(
        kg_ec_key_pair_party2: String,
        public_share: String,
        party_two_paillier: String
    ) -> Result<JsValue, JsValue> {
        let kg_ec_key_pair_party2: EcKeyPair = match serde_json::from_str(&kg_ec_key_pair_party2) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        let public_share: GE = match serde_json::from_str(&public_share) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        let party_two_paillier: PaillierPublic = match serde_json::from_str(&party_two_paillier) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };

        let master_key = MasterKey2::set_master_key(
            &BigInt::from(0),
            &kg_ec_key_pair_party2,
            &public_share,
            &party_two_paillier,
        );

        Ok(serde_json::to_string(&master_key).unwrap().into())
    }
}


/// Provides wrappers for kms-secp256k1 MasterKey2 Sign methods
#[wasm_bindgen]
pub struct Sign;

#[wasm_bindgen]
impl Sign {
    pub fn first_message() -> Result<JsValue, JsValue> {
        let (eph_key_gen_first_message_party_two, eph_comm_witness, eph_ec_key_pair_party2) =
            MasterKey2::sign_first_message();

        // convert BigInts to Server version
        let eph_key_gen_first_message_party_two = json!({
            "pk_commitment": eph_key_gen_first_message_party_two.pk_commitment.to_str_radix(16),
            "zk_pok_commitment": eph_key_gen_first_message_party_two.zk_pok_commitment.to_str_radix(16)
        });

        // Place into JSON for return to JS
        Ok(
            json!(
                {
                    "eph_key_gen_first_message_party_two": eph_key_gen_first_message_party_two,
                    "eph_comm_witness": eph_comm_witness,
                    "eph_ec_key_pair_party2": eph_ec_key_pair_party2,
                }
            ).to_string().into()
        )
    }

    pub fn second_message(
        master_key: String,
        eph_ec_key_pair_party2: String,
        eph_comm_witness: String,
        eph_party1_first_message: String,
        message: String
    ) -> Result<JsValue, JsValue> {
        let master_key: MasterKey2 = match serde_json::from_str(&master_key) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        let eph_ec_key_pair_party2: EphEcKeyPair = match serde_json::from_str(&eph_ec_key_pair_party2) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        let eph_comm_witness: EphCommWitness = match serde_json::from_str(&eph_comm_witness) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        let eph_party1_first_message: EphKeyGenFirstMsg = match serde_json::from_str(&eph_party1_first_message) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };
        let message = match BigInt::from_str_radix(&message, 16) {
            Ok(val) => val,
            Err(err) => return Err(err.to_string().into())
        };


        let party_two_sign_message = master_key.sign_second_message(
            &eph_ec_key_pair_party2,
            eph_comm_witness,
            &eph_party1_first_message,
            &message,
        );

        // Change BigInt types
        let party_two_sign_message_str = serde_json::to_string(&party_two_sign_message).unwrap();
        let party_two_sign_message_str = convert_sign_message_to_server_deserializable(&party_two_sign_message_str);

        Ok(party_two_sign_message_str.into())
    }
}

// convert into client curv library bigint
pub fn convert_big_int_to_client_deserializable(json_str: &String, field_name: String) -> String {
    let mut json: HashMap<String, Value> =
        serde_json::from_str(json_str).expect("unable to parse JSON");

    let big_int_str = json[&field_name].as_str().ok_or(format!("None or invalid type at field {:?}", field_name)).unwrap();
    let big_int = BigInt::from_str_radix(big_int_str, 16).unwrap();

    json.insert(field_name, serde_json::to_value(&big_int).unwrap());

    serde_json::to_string(&json).unwrap()
}

/// specialised fn for taking apart serialized KeyGenParty1Message2 and converting BigInt types
/// into client deserializable
fn convert_key_gen_party1_msg_2_to_client_deserializable(json_str: &String) -> String {
    // convert c_key
    let json_str = convert_big_int_to_client_deserializable(json_str, "c_key".to_string());

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
    let field_comm_witness = "comm_witness".to_string();
    let comm_witness_obj = ecdh_second_message_json[&field_comm_witness].as_object()
        .ok_or(format!("None or invalid type at field_comm_witness {:?}", field_comm_witness)).unwrap();
    let comm_witness_str = serde_json::to_string(&comm_witness_obj).unwrap();

    // convert bigints pk_commitment_blind_factor and zk_pok_blind_factor
    let comm_witness_str = &convert_big_int_to_client_deserializable(&comm_witness_str.to_string(), "pk_commitment_blind_factor".to_string());
    let comm_witness_str = &convert_big_int_to_client_deserializable(&comm_witness_str.to_string(), "zk_pok_blind_factor".to_string());

    // Insert back into ecdh_second_message Object
    let comm_witness_json: HashMap<String, Value> =
        serde_json::from_str(&comm_witness_str).expect("unable to parse JSON");
    ecdh_second_message_json.insert(field_comm_witness, serde_json::to_value(&comm_witness_json).unwrap());

    // Insert ecdh_second_message back into full Json Object
    json.insert(field_ecdh_second_message, serde_json::to_value(&ecdh_second_message_json).unwrap());


    // pull out composite_dlog_proof object and translate to key -> item hashmap
    let field_composite_dlog_proof = "composite_dlog_proof".to_string();
    let composite_dlog_proof_obj = json[&field_composite_dlog_proof].as_object()
        .ok_or(format!("None or invalid type at field {:?}", field_composite_dlog_proof)).unwrap();
    let composite_dlog_proof_str = serde_json::to_string(&composite_dlog_proof_obj).unwrap();

    // convert bigints pk_commitment_blind_factor and zk_pok_blind_factor
    let composite_dlog_proof_str = &convert_big_int_to_client_deserializable(&composite_dlog_proof_str.to_string(), "x".to_string());
    let composite_dlog_proof_str = &convert_big_int_to_client_deserializable(&composite_dlog_proof_str.to_string(), "y".to_string());

    // Insert back into json Object
    let composite_dlog_proof_json: HashMap<String, Value> =
        serde_json::from_str(&composite_dlog_proof_str).expect("unable to parse JSON");
    json.insert(field_composite_dlog_proof, serde_json::to_value(&composite_dlog_proof_json).unwrap());



    // pull out pdl_statement object and translate to key -> item hashmap
    let field_pdl_statement = "pdl_statement".to_string();
    let pdl_statement_obj = json[&field_pdl_statement].as_object()
        .ok_or(format!("None or invalid type at field {:?}", field_pdl_statement)).unwrap();
    let pdl_statement_str = serde_json::to_string(&pdl_statement_obj).unwrap();

    // convert bigints ciphertext, h1, h2 and N_tilde
    let pdl_statement_str = &convert_big_int_to_client_deserializable(&pdl_statement_str.to_string(), "ciphertext".to_string());
    let pdl_statement_str = &convert_big_int_to_client_deserializable(&pdl_statement_str.to_string(), "h1".to_string());
    let pdl_statement_str = &convert_big_int_to_client_deserializable(&pdl_statement_str.to_string(), "h2".to_string());
    let pdl_statement_str = &convert_big_int_to_client_deserializable(&pdl_statement_str.to_string(), "N_tilde".to_string());

    // Insert back into json Object
    let pdl_statement_json: HashMap<String, Value> =
        serde_json::from_str(&pdl_statement_str).expect("unable to parse JSON");
    json.insert(field_pdl_statement, serde_json::to_value(&pdl_statement_json).unwrap());



    // pull out pdl_proof object and translate to key -> item hashmap
    let field_pdl_proof = "pdl_proof".to_string();
    let pdl_proof_obj = json[&field_pdl_proof].as_object()
        .ok_or(format!("None or invalid type at field {:?}", field_pdl_proof)).unwrap();
    let pdl_proof_str = serde_json::to_string(&pdl_proof_obj).unwrap();

    // convert bigints z, u2, u3, s1, s2, s3
    let pdl_proof_str = &convert_big_int_to_client_deserializable(&pdl_proof_str.to_string(), "z".to_string());
    let pdl_proof_str = &convert_big_int_to_client_deserializable(&pdl_proof_str.to_string(), "u2".to_string());
    let pdl_proof_str = &convert_big_int_to_client_deserializable(&pdl_proof_str.to_string(), "u3".to_string());
    let pdl_proof_str = &convert_big_int_to_client_deserializable(&pdl_proof_str.to_string(), "s1".to_string());
    let pdl_proof_str = &convert_big_int_to_client_deserializable(&pdl_proof_str.to_string(), "s2".to_string());
    let pdl_proof_str = &convert_big_int_to_client_deserializable(&pdl_proof_str.to_string(), "s3".to_string());

    // Insert back into json Object
    let pdl_proof_json: HashMap<String, Value> =
        serde_json::from_str(&pdl_proof_str).expect("unable to parse JSON");
    json.insert(field_pdl_proof, serde_json::to_value(&pdl_proof_json).unwrap());


    serde_json::to_string(&json).unwrap()
}

// convert into client curv library bigint
pub fn convert_big_int_to_server_deserializable(json_str: &String, field_name: String) -> String {
    let mut json: HashMap<String, Value> =
        serde_json::from_str(json_str).expect("unable to parse JSON");

    let big_int_str = serde_json::to_string(&json[&field_name].as_array().unwrap()).unwrap();
    let bit_int: BigInt = serde_json::from_str(&big_int_str).unwrap();

    json.insert(field_name, Value::String(bit_int.to_str_radix(16)));

    serde_json::to_string(&json).unwrap()
}

/// specialised fn for taking apart serialized KeyGenParty1Message2 and converting BigInt types
/// into server curv library bigint
pub fn convert_sign_message_to_server_deserializable(json_str: &String) -> String {
    // translate str to key -> item hashmap
    let mut json: HashMap<String, Value> =
        serde_json::from_str(&json_str).expect("unable to parse JSON");

    // pull out partial_sig object and translate to key -> item hashmap
    let field_partial_sig = "partial_sig".to_string();
    let partial_sig_obj = json[&field_partial_sig].as_object()
        .ok_or(format!("None or invalid type at field {:?}", field_partial_sig)).unwrap();
    let partial_sig_str = serde_json::to_string(&partial_sig_obj).unwrap();

    // convert bigint c3 to server's version
    let partial_sig_str = &convert_big_int_to_server_deserializable(&partial_sig_str.to_string(), "c3".to_string());

    // Insert back into json Object
    let partial_sig_json: HashMap<String, Value> =
        serde_json::from_str(&partial_sig_str).expect("unable to parse JSON");
    // ecdh_second_message_json.insert(comm_witness_field, serde_json::to_value(&comm_witness_json).unwrap());

    // Insert ecdh_second_message back into full Json Object
    json.insert(field_partial_sig, serde_json::to_value(&partial_sig_json).unwrap());

    // pull out second_message object and translate to key -> item hashmap
    let field_second_message = "second_message".to_string();
    let second_message_obj = json[&field_second_message].as_object()
        .ok_or(format!("None or invalid type at field {:?}", field_second_message)).unwrap();
    let second_message_str = serde_json::to_string(&second_message_obj).unwrap();

    let mut second_message_json: HashMap<String, Value> =
        serde_json::from_str(&second_message_str).expect("unable to parse JSON");

    // pull out comm_witness
    let field_comm_witness = "comm_witness".to_string();
    let comm_witness_obj = second_message_json[&field_comm_witness].as_object()
        .ok_or(format!("None or invalid type at field_comm_witness {:?}", field_comm_witness)).unwrap();
    let comm_witness_str = serde_json::to_string(&comm_witness_obj).unwrap();

    // convert bigints pk_commitment_blind_factor and zk_pok_blind_factor
    let comm_witness_str = &convert_big_int_to_server_deserializable(&comm_witness_str.to_string(), "pk_commitment_blind_factor".to_string());
    let comm_witness_str = &convert_big_int_to_server_deserializable(&comm_witness_str.to_string(), "zk_pok_blind_factor".to_string());

    // Insert back into ecdh_second_message Object
    let comm_witness_json: HashMap<String, Value> =
        serde_json::from_str(&comm_witness_str).expect("unable to parse JSON");
    second_message_json.insert(field_comm_witness, serde_json::to_value(&comm_witness_json).unwrap());

    // Insert second_message back into full Json Object
    json.insert(field_second_message, serde_json::to_value(&second_message_json).unwrap());

    serde_json::to_string(&json).unwrap()
}
