//! Key paths
//!
//! Structs defining and storing protocol of key generation.
//! Structs differ in their storage/access of keys:
//!     Storage by Bitcoin address, Public key and State Entity Address

use super::super::Result;
use crate::error::CError;
use crate::wallet::wallet::to_bitcoin_public_key;
use bitcoin::{
    secp256k1::{All, Secp256k1},
    util::bip32::{ChildNumber, ExtendedPrivKey, ExtendedPubKey},
    {PrivateKey, PublicKey},
};

use std::collections::HashMap;
use std::str::FromStr;

/// Struct stores key pairs and their derivation path position
#[derive(Debug, Copy, Clone)]
pub struct KeyDerivation {
    pub pos: u32,
    pub private_key: PrivateKey,
    pub public_key: Option<PublicKey>,
}
impl KeyDerivation {
    pub fn new(pos: u32, private_key: PrivateKey, public_key: Option<PublicKey>) -> Self {
        KeyDerivation {
            pos,
            private_key,
            public_key,
        }
    }
}

/// Standard keys fully owned by wallet stored by address information
pub struct KeyPathWithAddresses {
    pub ext_priv_key: ExtendedPrivKey,
    pub last_derived_pos: u32,
    pub addresses_derivation_map: HashMap<String, KeyDerivation>,
}

impl KeyPathWithAddresses {
    pub fn new(ext_priv_key: ExtendedPrivKey) -> KeyPathWithAddresses {
        KeyPathWithAddresses {
            ext_priv_key,
            last_derived_pos: 0,
            addresses_derivation_map: HashMap::new(),
        }
    }

    pub fn derive_new_key(&mut self, secp: &Secp256k1<All>) -> Result<ExtendedPrivKey> {
        self.ext_priv_key
            .ckd_priv(
                secp,
                ChildNumber::from_hardened_idx(self.last_derived_pos).unwrap(),
            )
            .map_err(|e| CError::from(e))
    }

    /// generate new bitcoin address
    pub fn get_new_address(&mut self) -> Result<bitcoin::Address> {
        let secp = Secp256k1::new();
        let new_ext_priv_key = self.derive_new_key(&secp)?;
        let new_ext_pub_key = ExtendedPubKey::from_private(&secp, &new_ext_priv_key);

        let address = bitcoin::Address::p2wpkh(
            &to_bitcoin_public_key(new_ext_pub_key.public_key.key),
            self.ext_priv_key.network,
        );

        self.last_derived_pos += 1;

        self.addresses_derivation_map.insert(
            address.to_string(),
            KeyDerivation::new(
                self.last_derived_pos,
                new_ext_priv_key.private_key,
                Some(new_ext_pub_key.public_key),
            ),
        );

        Ok(address)
    }

    fn derive_new_key_encoded_id(
        &mut self,
        secp: &Secp256k1<All>,
        child_id: ChildNumber,
    ) -> Result<ExtendedPrivKey> {
        self.ext_priv_key
            .ckd_priv(secp, child_id)
            .map_err(|e| CError::from(e))
    }

    /// generate new key using BIP-175-style encoding of the funding TxID
    pub fn get_new_address_encoded_id(&mut self, child_id: u32) -> Result<bitcoin::Address> {
        let secp = Secp256k1::new();

        let new_ext_priv_key =
            self.derive_new_key_encoded_id(&secp, ChildNumber::from_hardened_idx(child_id)?)?;
        let new_ext_pub_key = ExtendedPubKey::from_private(&secp, &new_ext_priv_key);

        let address = bitcoin::Address::p2wpkh(
            &to_bitcoin_public_key(new_ext_pub_key.public_key.key),
            self.ext_priv_key.network,
        );

        self.addresses_derivation_map.insert(
            address.to_string(),
            KeyDerivation::new(
                child_id,
                new_ext_priv_key.private_key,
                Some(new_ext_pub_key.public_key),
            ),
        );

        Ok(address)
    }

    /// Get address derivation information. Return None if address not derived in this key path (at least not yet).
    pub fn get_address_derivation(&self, address: &String) -> Option<KeyDerivation> {
        match self.addresses_derivation_map.get(address) {
            Some(entry) => Some(*entry),
            None => None,
        }
    }

    /// Return all addresses derived by this parent key.
    pub fn get_all_addresses(&self) -> Vec<bitcoin::Address> {
        let mut addrs = Vec::new();
        for (addr, _) in &self.addresses_derivation_map {
            addrs.push(bitcoin::Address::from_str(&addr).unwrap());
        }
        addrs
    }
}

/// Standard keys fully owned by wallet stored by public key
pub struct KeyPath {
    pub last_derived_pos: u32,
    pub ext_priv_key: ExtendedPrivKey,
    pub key_derivation_map: HashMap<PublicKey, KeyDerivation>,
}

impl KeyPath {
    pub fn new(ext_priv_key: ExtendedPrivKey) -> KeyPath {
        KeyPath {
            last_derived_pos: 0,
            ext_priv_key,
            key_derivation_map: HashMap::new(),
        }
    }

    pub fn derive_new_key(&mut self, secp: &Secp256k1<All>) -> Result<ExtendedPrivKey> {
        self.ext_priv_key
            .ckd_priv(
                secp,
                ChildNumber::from_hardened_idx(self.last_derived_pos).unwrap(),
            )
            .map_err(|e| CError::from(e))
    }

    /// generate new bitcoin address
    pub fn get_new_key(&mut self) -> Result<PublicKey> {
        let secp = Secp256k1::new();
        let new_ext_priv_key = self.derive_new_key(&secp)?;
        let new_ext_pub_key = ExtendedPubKey::from_private(&secp, &new_ext_priv_key);

        self.last_derived_pos += 1;
        self.key_derivation_map.insert(
            new_ext_pub_key.public_key,
            KeyDerivation::new(self.last_derived_pos, new_ext_priv_key.private_key, None),
        );

        Ok(new_ext_pub_key.public_key)
    }

    fn derive_new_key_encoded_id(
        &mut self,
        secp: &Secp256k1<All>,
        child_id: ChildNumber,
    ) -> Result<ExtendedPrivKey> {
        self.ext_priv_key
            .ckd_priv(secp, child_id)
            .map_err(|e| CError::from(e))
    }

    /// generate new key using BIP-175-style encoding of the funding TxID
    pub fn get_new_key_encoded_id(&mut self, child_id: u32) -> Result<PublicKey> {
        let secp = Secp256k1::new();

        let new_ext_priv_key =
            self.derive_new_key_encoded_id(&secp, ChildNumber::from_hardened_idx(child_id)?)?;
        let new_ext_pub_key = ExtendedPubKey::from_private(&secp, &new_ext_priv_key);

        self.key_derivation_map.insert(
            new_ext_pub_key.public_key,
            KeyDerivation::new(child_id, new_ext_priv_key.private_key, None),
        );

        Ok(new_ext_pub_key.public_key)
    }

    /// Get corresponding private key for a public key. Return None if key not derived in this path (at least not yet).
    pub fn get_key_derivation(&self, public_key: &PublicKey) -> Option<KeyDerivation> {
        match self.key_derivation_map.get(public_key) {
            Some(entry) => {
                let mut full_derivation = entry.clone();
                full_derivation.public_key = Some(public_key.clone());
                Some(full_derivation)
            }
            None => None,
        }
    }

    #[allow(dead_code)]
    /// Return all public keys derived by this parent key.
    fn get_all_keys(&self) -> Vec<PublicKey> {
        let mut pub_keys = Vec::new();
        for (pub_key, _) in &self.key_derivation_map {
            pub_keys.push(*pub_key);
        }
        pub_keys
    }
}

pub fn funding_txid_to_int(funding_txid: &String) -> Result<u32> {
    u32::from_str_radix(&funding_txid[0..6], 16).map_err(|e| CError::from(e))
}

#[cfg(test)]
mod tests {
    use super::*;
    extern crate shared_lib;
    use bitcoin::Network;

    fn gen_ext_priv_key() -> ExtendedPrivKey {
        ExtendedPrivKey::new_master(Network::Regtest, &[0xcd; 32]).unwrap()
    }

    #[test]
    fn test_key_generation() {
        let mut addr_key_path = KeyPathWithAddresses::new(gen_ext_priv_key());
        let addr1 = addr_key_path.get_new_address().unwrap();
        assert!(addr_key_path
            .get_address_derivation(&addr1.to_string())
            .is_some());
        assert!(addr_key_path
            .get_address_derivation(&String::from("1111111"))
            .is_none());
        let _ = addr_key_path.get_new_address();
        let _ = addr_key_path.get_new_address();
        assert_eq!(addr_key_path.get_all_addresses().len(), 3);

        let mut key_path = KeyPath::new(gen_ext_priv_key());
        let key1 = key_path.get_new_key().unwrap();
        assert!(key_path.get_key_derivation(&key1).is_some());
        let key2 = key_path.get_new_key_encoded_id(9999999).unwrap();
        assert!(key_path.get_key_derivation(&key2).is_some());

        let _ = key_path.get_new_key();
        assert_eq!(key_path.get_all_keys().len(), 3);
    }

    #[test]
    fn test_derivation_storage() {
        let secp = Secp256k1::new();
        let priv_key = gen_ext_priv_key();
        let child1ext = priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(0).unwrap())
            .unwrap();
        let child1pub = to_bitcoin_public_key(
            ExtendedPubKey::from_private(&secp, &child1ext)
                .public_key
                .key,
        );

        let mut addr_key_path = KeyPathWithAddresses::new(priv_key);
        let addr1 = addr_key_path.get_new_address().unwrap();
        assert_eq!(
            addr_key_path
                .get_address_derivation(&addr1.to_string())
                .unwrap()
                .private_key,
            child1ext.private_key
        );

        let mut key_path = KeyPath::new(priv_key);
        let key1 = key_path.get_new_key().unwrap();
        assert_eq!(
            key_path
                .get_key_derivation(&key1)
                .unwrap()
                .public_key
                .unwrap(),
            child1pub
        );

        let key2 = key_path.get_new_key_encoded_id(9999999).unwrap();
        assert_eq!(key_path.get_key_derivation(&key2).unwrap().pos, 9999999);
    }
}
