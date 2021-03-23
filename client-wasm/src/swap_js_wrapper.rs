use wasm_bindgen::prelude::*;

use serde_json::json;
use curv::{elliptic::curves::traits::{ECScalar, ECPoint}, FE, GE, BigInt};
use hex;
use rand;
use uuid::Uuid;
use schemars;
use rocket_okapi::JsonSchema;
use bitcoin::{
    hashes::{sha256d, Hash},
    secp256k1::{PublicKey, Secp256k1, SecretKey, Message, Signature},
};
use std::str::FromStr;
use curv::arithmetic::traits::Converter;

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
        //let e_rev = e.iter().rev().cloned().collect::<Vec<u8>>();
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
        let r_prime: GE =
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

    let r: GE = *r_prime * u + p * v;

    let e = match calc_e(r, m){
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
    let x: FE =
        serde_json::from_str(x_str).expect("unable to parse JSON");

    let e_prime: FE =
        serde_json::from_str(e_prime_str).expect("unable to parse JSON");

    let k: FE =
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
pub struct BSTRequestorData
{
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

    // Requester calculates
    //      s = s'u+v
    pub fn requester_calc_s(s_prime: String, u: String, v: String) -> Result<JsValue, JsValue> {
        let s_prime: FE = serde_json::from_str(&s_prime).expect("unable to parse JSON");
        let u: FE = serde_json::from_str(&u).expect("unable to parse JSON");
        let v: FE = serde_json::from_str(&v).expect("unable to parse JSON");

       let res = s_prime * u + v;
       Ok(
           json!(
               {
                   "unblinded_sig": res,
               }
           ).to_string().into()
       )

    }


}

/// Provides wrappers for Swap methods
#[wasm_bindgen]
pub struct Commitment;

#[wasm_bindgen]
impl Commitment {
    // Generate random nonce and return hash of data+nonce
    pub fn make_commitment(data: String) -> Result<JsValue, JsValue> {
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