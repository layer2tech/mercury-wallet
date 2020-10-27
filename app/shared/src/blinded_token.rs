//! Blind token
//!
//! Sign blinded message and verify that the signature is valid for the unblinded message.
//! Following

//! Based on work:
//! Blind Signature Scheme Based on Elliptic Curve Cryptography
//! Chwei-Shyong Tsai, Min-Shiang Hwang, Pei-Chen Sung
//! Department of Management Information System,National Chung Hsin
//! https://pdfs.semanticscholar.org/e58a/1713858a5b9355a9e18adfe3abfc05de244e.pdf

use super::Result;
use bitcoin::hashes::{sha256d, Hash};
use curv::{
    arithmetic::traits::Converter,
    elliptic::curves::traits::{ECPoint, ECScalar},
    BigInt, FE, GE,
};

// Notation:
//  x: Signer Priv key
//  q: Sign Pub key
//  k: Sign random
//  u,v: Requester randoms
//  m: Message
//  p: Generator point
// H(.): Hash function

// Protocol:
//  Signer generates
//      r' = kp

//  Requester calculates
//      r = ur' + vp,
//      e = H(r||m)
//      e' = e/u

//  Sender calculates
//      s' = xe'+k

// Requester calculates
//      s = s'u+v
// And verifies
//      sp=eq+r

/// blind spend signature
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BlindedSpendSignature {
    s_prime: FE,
}
impl Default for BlindedSpendSignature {
    fn default() -> Self {
        BlindedSpendSignature {
            s_prime: FE::zero(),
        }
    }
}

/// (s,r) blind spend token
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BlindedSpendToken {
    s: FE,
    r: GE,
    m: String,
}
impl Default for BlindedSpendToken {
    fn default() -> Self {
        BlindedSpendToken {
            s: FE::zero(),
            r: GE::generator(),
            m: String::default(),
        }
    }
}
impl BlindedSpendToken {
    pub fn new_random() -> Self {
        BlindedSpendToken {
            s: FE::new_random(),
            r: GE::random_point(),
            m: String::default(),
        }
    }
    pub fn get_msg(&self) -> String {
        self.m.to_owned()
    }
    pub fn set_msg(&mut self, msg: String) {
        self.m = msg
    }
}

/// Blind Spend Token data for each Swap. (priv, pub) keypair, k and R' value for signing and verification.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BSTSenderData {
    x: FE,
    q: GE,
    k: FE,
    r_prime: GE,
}
impl BSTSenderData {
    /// Generate new BSTSenderData for Swap
    pub fn setup() -> Self {
        let p: GE = ECPoint::generator(); // gen
        let x = FE::new_random(); // priv
        let q = p * x; //pub
        let (k, r_prime) = signer_gen_r_prime();
        BSTSenderData { x, q, k, r_prime }
    }

    pub fn get_r_prime(&self) -> GE {
        self.r_prime
    }

    /// Create a blind signature for some e_prime value
    pub fn gen_blind_signature(&self, e_prime: FE) -> BlindedSpendSignature {
        BlindedSpendSignature {
            s_prime: sender_calc_s_prime(self.x, e_prime, self.k),
        }
    }

    /// Verify blind spend token
    pub fn verify_blind_spend_token(&self, token: BlindedSpendToken) -> Result<bool> {
        verify_blind_sig(token.s, &token.m, self.q, token.r)
    }
}

/// Blind Spend Token data for each Swap. (priv, pub) keypair, k and R' value for signing and verification.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BSTRequestorData {
    u: FE,
    v: FE,
    r: GE,
    e_prime: FE,
    m: String,
}
impl BSTRequestorData {
    /// Generate new BSTRequestorData with senders r_prime value and a message m
    pub fn setup(r_prime: GE, m: &String) -> Result<Self> {
        let (u, v, r, e_prime) = requester_calc_e_prime(r_prime, &m)?;
        Ok(BSTRequestorData {
            u,
            v,
            r,
            e_prime,
            m: m.to_owned(),
        })
    }

    pub fn get_e_prime(&self) -> FE {
        self.e_prime
    }

    /// Unblind blind spend token signature
    pub fn unblind_signature(&self, signature: BlindedSpendSignature) -> FE {
        requester_calc_s(signature.s_prime, self.u, self.v)
    }

    /// Create BlindedSpendToken for blinded signature
    pub fn make_blind_spend_token(&self, s: FE) -> BlindedSpendToken {
        BlindedSpendToken {
            s,
            r: self.r,
            m: self.m.clone(),
        }
    }
}

///  Signer generates
///      r' = kp
pub fn signer_gen_r_prime() -> (FE, GE) {
    let k: FE = FE::new_random();
    let p: GE = ECPoint::generator();
    (k, p * k)
}

fn calc_e(r: GE, m: &String) -> Result<FE> {
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

///  Requester calculates
///      r = ur' + vp,
///      e = H(r||m)
///      e' = e/u
pub fn requester_calc_e_prime(r_prime: GE, m: &String) -> Result<(FE, FE, GE, FE)> {
    let u: FE = FE::new_random();
    let v: FE = FE::new_random();
    let p: GE = ECPoint::generator();

    let r: GE = r_prime * u + p * v;

    let e = calc_e(r, m)?;

    let e_prime = e * u.invert();
    Ok((u, v, r, e_prime))
}

///  Sender calculates
///      s' = xe'+k
pub fn sender_calc_s_prime(x: FE, e_prime: FE, k: FE) -> FE {
    x * e_prime + k
}

/// Requester calculates
///      s = s'u+v
pub fn requester_calc_s(s_prime: FE, u: FE, v: FE) -> FE {
    s_prime * u + v
}

/// Verify sig
///      sp=eq+r
pub fn verify_blind_sig(s: FE, m: &String, q: GE, r: GE) -> Result<bool> {
    let p: GE = ECPoint::generator();
    let e = calc_e(r, m)?;
    let sp = p * s;
    let eq_plus_r = q * e + r;
    if sp == eq_plus_r {
        return Ok(true);
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_blind_sign() {
        // Sender init vars for BST
        let p: GE = ECPoint::generator(); // gen
        let x = FE::new_random(); // priv
        let q = p * x; //pub
        let (k, r_prime) = signer_gen_r_prime();

        let m = "swap ID".to_string();

        // Requester setup BST generation
        let (u, v, r, e_prime) = requester_calc_e_prime(r_prime, &m).unwrap();

        // Sender create BST
        let s_prime = sender_calc_s_prime(x, e_prime, k);

        // Requester unblind
        let s = requester_calc_s(s_prime, u, v);

        // Sender verify
        assert!(verify_blind_sig(s, &m, q, r).unwrap());
    }

    #[test]
    fn test_blind_sign_structs() {
        let msg = "Message".to_string();
        // Sender, Requestor init
        let sender = BSTSenderData::setup();
        let requestor = BSTRequestorData::setup(sender.r_prime, &msg).unwrap();

        let blind_sig = sender.gen_blind_signature(requestor.e_prime);
        let unblind_sig = requestor.unblind_signature(blind_sig);

        let blind_spend_token = requestor.make_blind_spend_token(unblind_sig);

        assert!(sender.verify_blind_spend_token(blind_spend_token).unwrap());
    }
}
