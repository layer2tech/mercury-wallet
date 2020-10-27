//! State Chain
//!
//! State chain is the data structure used to track ownership of a UTXO co-owned by the State Entity.
//! An owner provides a key (called proof key) which gets appended to the state chain once their
//! ownership is confirmed.
//! Then, to pass ownership over to a new proof key the current owner signs a StateChainSig struct
//! which includes the new owners proof key. This new proof key is then appended to the state chain
//! as before. Thus ownership can be verified by ensuring the newest proof key has been signed for by the
//! previous proof key.
//! To withdraw, and hence bring an end to the State Chain, the StateChainSig struct contains the
//! withdrawal address.

use super::Result;
use crate::error::SharedLibError;
use crate::Verifiable;

use bitcoin::{
    hashes::{sha256d, Hash},
    secp256k1::{Message, PublicKey, Secp256k1, SecretKey, Signature},
};
use monotree::{
    hasher::{Blake3, Hasher},
    tree::verify_proof,
    {Monotree, Proof},
};

use chrono::{Duration, NaiveDateTime, Utc};
use std::panic;
use std::sync::{Arc, Mutex};
use std::{convert::TryInto, panic::AssertUnwindSafe, str::FromStr};

/// A list of States in which each State signs for the next State.
#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct StateChain {
    /// chain of transitory key history
    pub chain: Vec<State>,
}

impl StateChain {
    pub fn new(data: String) -> Self {
        StateChain {
            chain: vec![State {
                data,
                next_state: None,
            }],
        }
    }

    pub fn get_tip(&self) -> Result<State> {
        Ok(self
            .chain
            .last()
            .ok_or(SharedLibError::Generic(String::from("StateChain empty")))?
            .clone())
    }

    pub fn add(&mut self, state_chain_sig: StateChainSig) -> Result<()> {
        let mut tip = self.get_tip()?;

        // verify previous state has signature and signs for new proof_key
        let prev_proof_key = tip.data.clone();
        state_chain_sig.verify(&prev_proof_key)?;

        // add sig to current tip
        tip.next_state = Some(state_chain_sig.clone());
        self.chain.pop();
        self.chain.push(tip);

        // add new tip to chain
        Ok(self.chain.push(State {
            data: state_chain_sig.data,
            next_state: None,
        }))
    }
}

pub fn get_time_now() -> NaiveDateTime {
    Utc::now().naive_utc()
}

// Get NaiveDateTime for punishment set from now
pub fn get_locked_until(punishment_duration: i64) -> Result<NaiveDateTime> {
    let current_time = get_time_now();
    match current_time.checked_add_signed(Duration::seconds(punishment_duration)) {
        None => {
            return Err(SharedLibError::Generic(format!(
                "State Chain locked duration overflow."
            )))
        }
        Some(v) => return Ok(v),
    }
}

/// Check if state chain is available for transfer/withdrawal
pub fn is_locked(locked_until: NaiveDateTime) -> Result<()> {
    let current_time = Utc::now().naive_utc().timestamp();
    let time_left = locked_until.timestamp() - current_time;

    match time_left > 0 {
        true => {
            return Err(SharedLibError::Generic(format!(
                "State Chain locked for {} minutes.",
                (time_left / 60) + 1
            )))
        }
        false => return Ok(()),
    }
}

/// Each State in the Chain of States
#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct State {
    pub data: String,                      // proof key or address
    pub next_state: Option<StateChainSig>, // signature representing passing of ownership
}
/// Data necessary to create ownership transfer signatures
#[derive(Serialize, Deserialize, Debug, PartialEq, Clone, Default)]
pub struct StateChainSig {
    pub purpose: String, // "TRANSFER", "TRANSFER-BATCH" or "WITHDRAW"
    pub data: String,    // proof key, state chain id or address
    sig: String,
}

impl StateChainSig {
    /// Create message to be signed
    fn to_message(purpose: &String, data: &String) -> Result<Message> {
        let mut str = purpose.clone();
        str.push_str(&data);
        let hash = sha256d::Hash::hash(&str.as_bytes());
        Ok(Message::from_slice(&hash)?)
    }

    /// Generate signature for change of state chain ownership
    pub fn new(proof_key_priv: &SecretKey, purpose: &String, data: &String) -> Result<Self> {
        let secp = Secp256k1::new();
        let message = StateChainSig::to_message(purpose, data)?;
        let sig = secp.sign(&message, &proof_key_priv);
        Ok(StateChainSig {
            purpose: purpose.clone(),
            data: data.clone(),
            sig: sig.to_string(),
        })
    }

    /// Verify self's signature for transfer or withdraw
    pub fn verify(&self, pk: &String) -> Result<()> {
        let message = StateChainSig::to_message(&self.purpose, &self.data)?;
        Signature::from_str(&self.sig)
            .unwrap()
            .verify(&PublicKey::from_str(&pk).unwrap(), &message)
    }
}

/// Insert new statechain entry into Sparse Merkle Tree and return proof
pub fn update_statechain_smt<D: monotree::database::Database>(
    tree: Arc<Mutex<Monotree<D, Blake3>>>,
    root: &Option<monotree::Hash>,
    funding_txid: &String,
    entry: &String,
) -> Result<Option<monotree::Hash>> {
    let key: &monotree::Hash = match funding_txid[..32].as_bytes().try_into() {
        Ok(k) => k,
        Err(e) => return Err(SharedLibError::FormatError(e.to_string())),
    };
    let entry: &monotree::Hash = match entry[..32].as_bytes().try_into() {
        Ok(entry) => entry,
        Err(e) => return Err(SharedLibError::FormatError(e.to_string())),
    };

    // update smt
    let mut new_root: Option<[u8; 32]> = None;
    let result = panic::catch_unwind(AssertUnwindSafe(|| {
        let mut tree = tree.lock().unwrap();
        new_root = tree.insert(root.as_ref(), key, entry).unwrap();
    }));

    if let Err(_) = result {
        return Err(SharedLibError::Generic(String::from(
            "SMT insert failure. Probably caused by Root provided not being correct.",
        )));
    }

    Ok(new_root)
}

// Method can run as a seperate proof generation daemon. Must check root exists before calling.
pub fn gen_proof_smt<D: monotree::database::Database>(
    tree: Arc<Mutex<Monotree<D, Blake3>>>,
    root: &Option<monotree::Hash>,
    funding_txid: &String,
) -> Result<Option<Proof>> {
    let key: &monotree::Hash = funding_txid[..32].as_bytes().try_into().unwrap();

    // generate inclusion proof
    let mut proof: Option<Vec<(bool, Vec<u8>)>> = None;
    let result = panic::catch_unwind(AssertUnwindSafe(|| {
        let mut tree = tree.lock().unwrap();
        proof = tree.get_merkle_proof(root.as_ref(), key).unwrap();
    }));

    if let Err(_) = result {
        return Err(SharedLibError::Generic(String::from(
            "Get merkle proof failure. Probably caused by Root provided not being correct.",
        )));
    }

    Ok(proof)
}

pub fn verify_statechain_smt(
    root: &Option<monotree::Hash>,
    proof_key: &String,
    proof: &Option<Proof>,
) -> bool {
    let entry: &monotree::Hash = proof_key[..32].as_bytes().try_into().unwrap();
    let hasher = Blake3::new();
    verify_proof(&hasher, root.as_ref(), &entry, proof.as_ref())
}

#[cfg(test)]
mod tests {

    use super::*;
    use bitcoin::secp256k1::{PublicKey, Secp256k1, SecretKey};
    use monotree::database::MemoryDB;

    #[test]
    fn test_add_to_state_chain() {
        let secp = Secp256k1::new();
        let proof_key1_priv = SecretKey::from_slice(&[1; 32]).unwrap();
        let proof_key1_pub = PublicKey::from_secret_key(&secp, &proof_key1_priv);

        let mut state_chain = StateChain::new(proof_key1_pub.to_string());

        assert_eq!(state_chain.chain.len(), 1);

        // StateChainSig.verify called in function below
        let new_state_sig = StateChainSig::new(
            &proof_key1_priv,
            &String::from("TRANSFER"),
            &String::from("03b971d624567214a2e9a53995ee7d4858d6355eb4e3863d9ac540085c8b2d12b3"),
        )
        .unwrap();

        // add to state chain
        let _ = state_chain.add(new_state_sig.clone());
        assert_eq!(state_chain.chain.len(), 2);

        // try add again (signature no longer valid for proof key "03b971d624567214a2e9a53995ee7d4858d6355eb4e3863d9ac540085c8b2d12b3")
        let fail = state_chain.add(new_state_sig);
        assert!(fail.is_err());
    }

    #[test]
    fn test_state_chain_locked() {
        let locked_until = Utc::now().naive_utc() - Duration::seconds(5);
        assert!(is_locked(locked_until).is_ok());
        let locked_until = Utc::now().naive_utc() + Duration::seconds(5);
        assert!(is_locked(locked_until).is_err());
    }

    #[test]
    fn test_update_and_prove_sc_smt() {
        let funding_txid =
            String::from("c1562f7f15d6b8a51ea2e7035b9cdb8c6c0c41fecb62d459a3a6bf738ff0db0e");
        let proof_key =
            String::from("03b971d624567214a2e9a53995ee7d4858d6355eb4e3863d9ac540085c8b2d12b3");

        let tree = Arc::new(Mutex::new(Monotree::<MemoryDB, Blake3>::new("")));
        let root: Option<monotree::Hash> = None;

        let root = update_statechain_smt::<monotree::database::MemoryDB>(
            tree.clone(),
            &root,
            &funding_txid,
            &proof_key,
        )
        .unwrap();

        let sc_smt_proof1 =
            gen_proof_smt::<monotree::database::MemoryDB>(tree.clone(), &root, &funding_txid)
                .unwrap();

        assert!(verify_statechain_smt(&root, &proof_key, &sc_smt_proof1));

        // update with new proof key and try again
        let proof_key =
            String::from("13b971d624567214a2e9a53995ee7d4858d6355eb4e3863d9ac540085c8b2d12b3");
        let root = update_statechain_smt::<monotree::database::MemoryDB>(
            tree.clone(),
            &root,
            &funding_txid,
            &proof_key,
        )
        .unwrap();

        let sc_smt_proof2 =
            gen_proof_smt::<monotree::database::MemoryDB>(tree.clone(), &root, &funding_txid)
                .unwrap();
        assert!(verify_statechain_smt(&root, &proof_key, &sc_smt_proof2));
    }
}
