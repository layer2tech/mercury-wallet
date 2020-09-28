//
extern crate bitcoin;
extern crate bitcoin_hashes;
extern crate chrono;
extern crate hex;
extern crate kms;
extern crate multi_party_ecdsa;
extern crate rocket;
extern crate rocket_contrib;
extern crate uuid;

#[macro_use]
extern crate serde_derive;
extern crate serde;
extern crate serde_json;

pub mod mocks;

extern crate itertools;

extern crate arrayvec;
extern crate base64;
extern crate merkletree;
extern crate reqwest;

pub mod commitment;
pub mod blinded_token;
pub mod error;
pub mod mainstay;
pub mod state_chain;
pub mod structs;
pub mod util;
pub mod ecies;

use bitcoin::secp256k1::{Message, Secp256k1, Signature, PublicKey};

type Result<T> = std::result::Result<T, error::SharedLibError>;

pub type Hash = monotree::Hash;

use crate::mainstay::{Attestable, Commitment, CommitmentInfo};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Root {
    id: Option<i64>,
    pub value: Option<Hash>,
    commitment_info: Option<CommitmentInfo>,
}

impl Root {
    pub fn from(
        id: Option<i64>,
        value: Option<Hash>,
        commitment_info: &Option<CommitmentInfo>,
    ) -> Result<Self> {
        match (value, commitment_info) {
            (Some(_), Some(_)) => Err(error::SharedLibError::FormatError(
                "Root constructor: one of either a Hash value or CommitmentInfo are required"
                    .to_string(),
            )
            .into()),
            _ => Ok(Self {
                id,
                value,
                commitment_info: commitment_info.clone(),
            }),
        }
    }

    pub fn from_random() -> Self {
        Self::from_hash(&monotree::utils::random_hash())
    }

    pub fn from_hash(hash: &Hash) -> Self {
        Self {
            id: None,
            value: Some(*hash),
            commitment_info: None,
        }
    }

    pub fn from_commitment_info(ci: &CommitmentInfo) -> Self {
        Self {
            id: None,
            value: None,
            commitment_info: Some(ci.clone()),
        }
    }

    pub fn set_id(&mut self, id: &i64) {
        self.id = Some(*id);
    }

    pub fn id(&self) -> Option<i64> {
        self.id
    }

    pub fn hash(&self) -> Hash {
        match self.value {
            Some(v) => v,
            None => self
                .commitment_info
                .as_ref()
                .unwrap()
                .commitment()
                .to_hash(),
        }
    }

    pub fn commitment_info(&self) -> &Option<CommitmentInfo> {
        &self.commitment_info
    }

    pub fn is_confirmed(&self) -> bool {
        match self.commitment_info() {
            None => false,
            Some(c) => c.is_confirmed(),
        }
    }
}

impl Attestable for Root {
    fn commitment(&self) -> mainstay::Result<mainstay::Commitment> {
        match &self.value {
            Some(v) => Ok(Commitment::from_hash(v)),
            None => match self.commitment_info.as_ref() {
                Some(c) => Ok(c.commitment()),
                None => Err(error::SharedLibError::Generic(
                    "commitment not found in Root".to_string(),
                )
                .into()),
            },
        }
    }
}

use std::fmt;

impl fmt::Display for Root {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let id_str = match self.id {
            Some(id) => id.to_string(),
            None => "None".to_string(),
        };

        let ci_str = match self.commitment_info() {
            Some(ci) => ci.to_string(),
            None => "None".to_string(),
        };

        write!(
            f,
            "id: {}, hash: {}, is_confirmed: {}, commitment_info: {})",
            id_str,
            hex::encode(self.hash()),
            self.is_confirmed(),
            ci_str
        )
    }
}

pub trait Verifiable {
    fn verify_btc(&self, key: &bitcoin::util::key::PublicKey, message: &Message) -> Result<()>;
    fn verify(&self, key: &PublicKey, message: &Message) -> Result<()>;
}

impl Verifiable for Signature {
    fn verify_btc(&self, key: &bitcoin::util::key::PublicKey, message: &Message) -> Result<()>{
        let key = &PublicKey::from_slice(key.to_bytes().as_slice())?;
        self.verify(key, message)
    }

    fn verify(&self, key: &PublicKey, message: &Message) -> Result<()>{
         let secp = Secp256k1::new();
         Ok(secp.verify(
            message,
            &self,
            key
        )?)
    }
}
