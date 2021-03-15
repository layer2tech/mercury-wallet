use wasm_bindgen::prelude::*;

use serde_json::{json, Value};
use curv::{elliptic::curves::traits::{ECScalar, ECPoint}, FE, GE, BigInt};
use curv::arithmetic::big_num::Num;
use crate::curv::arithmetic::traits::Converter;
use kms::ecdsa::two_party::MasterKey2;
use kms::ecdsa::two_party::party1::KeyGenParty1Message2;
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::{PaillierPublic, EphCommWitness, EcKeyPair, EphEcKeyPair};
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_one::{EphKeyGenFirstMsg, KeyGenFirstMsg};
use std::collections::HashMap;
use hex;
use rand;
use uuid::Uuid;
use schemars;
use std::string;
use rocket_okapi::JsonSchema;
use bitcoin::{
    hashes::{sha256d, Hash},
    secp256k1::{PublicKey, Secp256k1, SecretKey, Message, Signature},
};
use std::str::FromStr;

//use mercury_shared::{util::keygen::Message, swap_data::SwapToken};

#[derive(JsonSchema)]
#[schemars(remote = "Uuid")]
pub struct UuidDef(String);

fn calc_e(r: GE, m: &String) -> Result<FE, Box<dyn std::error::Error>> {
        let mut data_vec = m.as_bytes().iter().cloned().collect::<Vec<u8>>();
        let mut r_vec = serde_json::to_string(&r)?
            .as_bytes()
            .iter()
            .cloned()
            .collect::<Vec<u8>>();
        data_vec.append(&mut r_vec);
        let e = sha256d::Hash::hash(&data_vec);
        let hex = hex::encode(e);
        let big_int = BigInt::from_hex(&hex);
        Ok(curv::elliptic::curves::traits::ECScalar::from(&big_int))
}

/// Provides wrappers for Swap methods
#[wasm_bindgen]
pub struct Swap;

#[wasm_bindgen]
impl Swap {
    pub fn requester_calc_eprime(r_prime_str: String, m: String) -> Result<JsValue, JsValue> 
    {
        let mut r_prime: GE =
            serde_json::from_str(&r_prime_str).expect("unable to parse JSON");

        let (u,v,r,e_prime) = match requester_calc_eprime(&r_prime, &m){
            Ok(r) => r,
            Err(err) => return Err(err.to_string().into())
        };

         // Place into JSON for return to JS
         Ok(
            json!(
                {
                    "u": u,
                    "v": v,
                    "r": r,
                    "e_prime": e_prime,
                }
            ).to_string().into()
        )
    }
}


pub fn requester_calc_eprime(r_prime: &GE, m: &String) -> Result<(FE, FE, GE, FE), Box<dyn std::error::Error>> 
{
    let u: FE = FE::new_random();
    let v: FE = FE::new_random();
    let p: GE = ECPoint::generator();
  
    let r: GE = r_prime * &u + p * v;
  
    let e = match calc_e(r, &m){
        Ok(e)=>e,
        Err(err) => return Err(err.to_string().into()),
    };
  
    let e_prime = e * u.invert();

    Ok((u,v,r,e_prime))
}

 /// Verify blind spend token
pub fn verify_blind_sig(s_str: &String, m: &String, 
    q_str: &String, r_str: &String) -> Result<bool, Box<dyn std::error::Error>> {
    let s: FE =
        serde_json::from_str(s_str).expect("unable to parse JSON");

    let q: GE =    
        serde_json::from_str(q_str).expect("unable to parse JSON");

    let r: GE =    
        serde_json::from_str(r_str).expect("unable to parse JSON");

    let p: GE = ECPoint::generator();
    let e = calc_e(r, m)?;
    let sp = p * s;
    let eq_plus_r = q * e + r;
    if sp == eq_plus_r {
        return Ok(true);
    }
    Ok(false)
}

/// Provides wrappers for Swap methods
#[wasm_bindgen]
pub struct BSTSenderData;

#[wasm_bindgen]
impl BSTSenderData {
    /// Generate new BSTSenderData for Swap
    pub fn setup() -> Result<JsValue, JsValue> {
        let p: GE = ECPoint::generator(); // gen
        let x = FE::new_random(); // priv
        let q = p * x; //pub

        let k: FE = FE::new_random();
        let r_prime = p * k;

         // Place into JSON for return to JS
         Ok(
            json!(
                {
                    "x": x,
                    "q": q,
                    "k": k,
                    "r_prime": r_prime,
                }
            ).to_string().into()
        )
    }
}

 /// Create a blind signature for some e_prime value
 pub fn gen_blind_signature(x_str: &String, e_prime_str: &String, k_str: &String) -> Result<JsValue, JsValue> {
    let mut x: FE =
        serde_json::from_str(x_str).expect("unable to parse JSON");

    let mut e_prime: FE =
        serde_json::from_str(e_prime_str).expect("unable to parse JSON");

    let mut k: FE =
        serde_json::from_str(k_str).expect("unable to parse JSON");

    let s_prime = x * e_prime + k;

     // Place into JSON for return to JS
     // BlindedSpendSignature
     Ok(
        json!(
            {
           "s_prime": s_prime,
            }
        ).to_string().into()
    )
}


/// Provides wrappers for Swap methods
#[wasm_bindgen]
#[derive(Deserialize, Debug)]
pub struct BSTRequestorData{
    u: FE,
    v: FE,
    r: GE,
    e_prime:FE,
    m: String,
}

#[wasm_bindgen]
impl BSTRequestorData {
    pub fn setup(r_prime_str: String, m: String) -> Result<JsValue, JsValue> {
       
        let r_prime: GE = match serde_json::from_str(&r_prime_str){
            Ok(r) => r,
            Err(err) => return Err(format!("{}: GE from {}", err.to_string(), r_prime_str).into())
        };
        

        let (u, v, r, e_prime) = match requester_calc_eprime(&r_prime, &m){
            Ok(r) => r,
            Err(err) => return Err(err.to_string().into()),
        };

        Ok(
            json!(
                {
                    "u": u,
                    "v": v,
                    "r": r,
                    "e_prime": e_prime,
                    "m": m
                }
            ).to_string().into()
        )
    }

     /// Create BlindedSpendToken for blinded signature
     pub fn make_blind_spend_token(bst_requestor_data_str: String, signature_str: String) -> Result<JsValue, JsValue> {
        let s: FE = serde_json::from_str(&signature_str).expect("unable to parse JSON");
        let bst_rd: BSTRequestorData =
            serde_json::from_str(&bst_requestor_data_str).expect("unable to parse JSON");
         //s: FE
        //BlindedSpendToken 
        Ok(
            json!(
                {
                    "s": s,
                    "r": bst_rd.r,
                    "m": bst_rd.m,
                }
            ).to_string().into()
        )
    }

    /// Requester calculates
    ///      s = s'u+v
    fn requester_calc_s(s_prime: FE, u: FE, v: FE) -> FE {
        s_prime * u + v
    }

}

/// Provides wrappers for Swap methods
#[wasm_bindgen]
pub struct Commitment;

#[wasm_bindgen]
impl Commitment {
    // Generate random nonce and return hash of data+nonce
    pub fn setup(data: String) -> Result<JsValue, JsValue> {
    //pub fn make_commitment(data: &String) -> (String, [u8; 32]) {
        let nonce = rand::random::<[u8; 32]>();
        // append nonce to data and hash
        let mut data_vec = data.as_bytes().iter().cloned().collect::<Vec<u8>>();
        let mut nonce_vec = nonce.iter().cloned().collect::<Vec<_>>();
        data_vec.append(&mut nonce_vec);

        let commitment = sha256d::Hash::hash(&data_vec);

        Ok(
            json!(
                {
                    "commitment": commitment.to_string(),
                    "nonce": nonce,
                }
            ).to_string().into()
        )
    }
}

#[wasm_bindgen]
pub struct SwapTokenW;

/// Struct defines a Swap. This is signed by each participant as agreement to take part in the swap.
#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone)]
pub struct SwapToken {
    #[schemars(with = "UuidDef")]
    pub id: Uuid,
    pub amount: u64,
    pub time_out: u64,
    #[schemars(with = "UuidDef")]
    pub statechain_ids: Vec<Uuid>,
}

#[wasm_bindgen]
impl SwapTokenW {

    fn from_str(swap_token_str: &String) -> Result<SwapToken,Box<dyn std::error::Error>> {
        match serde_json::from_str(swap_token_str){
            Ok(r) => Ok(r),
            Err(err) => Err(format!("SwapTokenW: {}", err.to_string()).into()),
        }
    }

    pub fn to_message_str(swap_token_str: String) -> Result<JsValue, JsValue> { 
        let st = match SwapTokenW::from_str(&swap_token_str){
            Ok(r) => r,
            Err(err) => return Err(format!("SwapTokenW: {}", err.to_string()).into()),
        };

        let mut str = st.amount.to_string();
        str.push_str(&st.time_out.to_string());
        str.push_str(&format!("{:?}", st.statechain_ids));
        
        Ok(
            json!(str).to_string().into()
        )
    }

    /// Create message to be signed
    pub fn to_message_ser(swap_token_str: String) -> Result<JsValue, JsValue> { 
        let st = match SwapTokenW::from_str(&swap_token_str){
            Ok(r) => r,
            Err(err) => return Err(format!("SwapTokenW: {}", err.to_string()).into()),
        };

        let mut str = st.amount.to_string();
        str.push_str(&st.time_out.to_string());
        str.push_str(&format!("{:?}", st.statechain_ids));
        //info!("swap token message str: {}", str);
        //info!("swap token message bytes: {:?}", &str.as_bytes());
        let hash = sha256d::Hash::hash(&str.as_bytes());
        //info!("swap token message hash: {}", hash);
        Ok(
            json!(hash).to_string().into()
        )
    }

    fn to_message(swap_token_str: String) -> Result<Message, Box<dyn std::error::Error>> { 
        let st = match SwapTokenW::from_str(&swap_token_str){
            Ok(r) => r,
            Err(err) => return Err(format!("SwapTokenW: {}", err.to_string()).into()),
        };

        let mut str = st.amount.to_string();
        str.push_str(&st.time_out.to_string());
        str.push_str(&format!("{:?}", st.statechain_ids));
        //info!("swap token message str: {}", str);
        //info!("swap token message bytes: {:?}", &str.as_bytes());
        let hash = sha256d::Hash::hash(&str.as_bytes());
        //info!("swap token message hash: {}", hash);
        Ok(Message::from_slice(&hash)?)
    }

    pub fn sign(swap_token_str: String, proof_key_priv_str: String) -> Result<JsValue, JsValue> { 
        let key = match SecretKey::from_str(&proof_key_priv_str){
            Ok(r)=>r,
            Err(err) => return Err(format!("SwapTokenW - parse secret key:{}, {}",&proof_key_priv_str, err.to_string()).into()),
        };
        
        
        //let key: SecretKey =  match serde_json::from_str(&proof_key_priv_str){
            //Ok(r) => r,
            //Err(err) => return Err(format!("SwapTokenW - parse secret key:{}, {}",&proof_key_priv_str, err.to_string()).into()),
        //};
       // let st = match SwapTokenW::from_str(&swap_token_str){
         //   Ok(r) => r,
          //  Err(err) => return Err(format!("SwapTokenW: {}", err.to_string()).into()),
        //};

        
        let secp = Secp256k1::new();

        let message = match SwapTokenW::to_message(swap_token_str){
            Ok(r) => r,
            Err(err) => return Err(format!("SwapTokenW: {}", err.to_string()).into()),
        };

        let signature = secp.sign(&message, &key).to_string();
        
        //info!("got signature: {}", signature);
        Ok(
            json!(signature).to_string().into()
        )
        
        //Ok(0.into())
    }

     /// Verify self's signature for transfer or withdraw
     pub fn verify_sig(pk_str: String, sig_str: String, swap_token_str: String) -> Result<JsValue, JsValue> {
        let pk = match PublicKey::from_str(&pk_str){
            Ok(r)=>r,
            Err(err) => return Err(format!("SwapTokenW - parse public key:{}, {}",&pk_str, err.to_string()).into()),
        };
        let sig = match Signature::from_str(&sig_str){
            Ok(r)=>r,
            Err(err) => return Err(format!("SwapTokenW - signature:{}, {}",&sig_str, err.to_string()).into()),
        };
        let message = match SwapTokenW::to_message(swap_token_str){
            Ok(r) => r,
            Err(err) => return Err(format!("SwapTokenW - message:{}, {}",&sig_str, err.to_string()).into()),
        };

        let secp = Secp256k1::new();

        let verify = secp.verify(&message, &sig, &pk).is_ok(); 

        Ok(
            json!(verify).to_string().into()
        )
    }
}

