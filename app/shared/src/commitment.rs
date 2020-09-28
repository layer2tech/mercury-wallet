//! Commitment
//!
//! Make Commitment to some data. Reveal nonce to verify.

use super::Result;
use crate::error::SharedLibError;
use bitcoin::hashes::{sha256d, Hash};
use rand::random;

// Generate random nonce and return hash of data+nonce
pub fn make_commitment(data: &String) -> (String, [u8; 32]) {
    let nonce = random::<[u8; 32]>();
    // append nonce to data and hash
    let mut data_vec = data.as_bytes().iter().cloned().collect::<Vec<u8>>();
    let mut nonce_vec = nonce.iter().cloned().collect::<Vec<_>>();
    data_vec.append(&mut nonce_vec);

    let commitment = sha256d::Hash::hash(&data_vec);
    return (commitment.to_string(), nonce);
}

// Find hash of data+nonce and verify that it equals hash
pub fn verify_commitment(hash: &String, data: &String, nonce: &[u8; 32]) -> Result<()> {
    let mut data_vec = data.as_bytes().iter().cloned().collect::<Vec<u8>>();
    let mut nonce_vec = nonce.iter().cloned().collect::<Vec<_>>();
    data_vec.append(&mut nonce_vec);

    if sha256d::Hash::hash(&data_vec).to_string() == hash.to_owned() {
        return Ok(());
    }
    Err(SharedLibError::Generic(String::from(
        "Commitment verification failed.",
    )))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_make_commitment() {
        let data = String::from("12345");
        let (comm, nonce) = make_commitment(&data);
        assert!(verify_commitment(&comm, &data, &nonce).is_ok());
    }
}
