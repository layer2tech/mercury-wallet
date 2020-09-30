//! Wallet
//!
//! Basic Bitcoin wallet functionality. Full key owned by this wallet.

use super::super::Result;
use shared_lib::{
    structs::{Protocol, SCEAddress},
    util::get_sighash,
    ecies::{WalletDecryptable, SelfEncryptable},
    ecies
};

use super::key_paths::{funding_txid_to_int, KeyPath, KeyPathWithAddresses};
use crate::error::{CError, WalletErrorType};
use crate::wallet::shared_key::SharedKey;
use crate::ClientShim;

use bitcoin::{
    hashes::sha256d,
    secp256k1::{key::SecretKey, All, Message, Secp256k1},
    util::bip32::{ChildNumber, ExtendedPrivKey},
    {Address, Network, OutPoint, PublicKey, TxIn},
};

use electrumx_client::{
    interface::Electrumx,
    response::{GetBalanceResponse, GetListUnspentResponse},
};

use serde_json::json;
use std::fs;
use std::str::FromStr;
use uuid::Uuid;

const WALLET_FILENAME: &str = "wallet/wallet.data";

/// Standard Bitcoin Wallet
pub struct Wallet {
    pub id: String,
    pub network: String,
    secp: Secp256k1<All>,
    // pub electrumx_client: Box<dyn Electrumx>,
    pub client_shim: ClientShim,

    pub master_priv_key: ExtendedPrivKey,
    pub keys: KeyPathWithAddresses,           // Keys for general usage
    pub se_backup_keys: KeyPathWithAddresses, // keys for use in State Entity back up transactions
    pub se_proof_keys: KeyPath,               // for use as State Entity proof keys
    pub se_key_shares: KeyPath,      // for derivation of private key shares used in shared_keys

    pub shared_keys: Vec<SharedKey>, // vector of keys co-owned with state entities
    pub require_mainstay: bool,
}
impl Wallet {
    pub fn new(
        seed: &[u8],
        network: &String,
        client_shim: ClientShim,
        // electrumx_client: Box<dyn Electrumx>,
    ) -> Wallet {
        let secp = Secp256k1::new();
        let master_priv_key =
            ExtendedPrivKey::new_master(network.parse::<Network>().unwrap(), seed).unwrap();

        let keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(0).unwrap())
            .unwrap();
        let keys = KeyPathWithAddresses::new(keys_master_ext_key);

        let se_backup_keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(1).unwrap())
            .unwrap();
        let se_backup_keys = KeyPathWithAddresses::new(se_backup_keys_master_ext_key);

        let se_proof_keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(2).unwrap())
            .unwrap();
        let se_proof_keys = KeyPath::new(se_proof_keys_master_ext_key);

        let se_key_shares_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(3).unwrap())
            .unwrap();
        let se_key_shares = KeyPath::new(se_key_shares_master_ext_key);

        Wallet {
            id: Uuid::new_v4().to_string(),
            network: network.to_string(),
            secp,
            // electrumx_client,
            client_shim,
            master_priv_key,
            keys,
            se_backup_keys,
            se_proof_keys,
            se_key_shares,
            shared_keys: vec![],
            require_mainstay: false,
        }
    }

    //pub fn shared_keys_mutable<'a>(&'a mut self) -> &'a mut Vec<SharedKey> {
    //&mut self.shared_keys
    //}

    pub fn set_require_mainstay(&mut self, val: bool) {
        self.require_mainstay = val;
    }

    pub fn require_mainstay(&self) -> bool {
        self.require_mainstay
    }

    /// serialize wallet to json
    pub fn to_json(&self) -> serde_json::Value {
        // get all encoded child indices for KeyPaths used in state entity protocols
        let mut se_backup_keys_pos_encoded = Vec::new();
        for (_, addr_derivation) in &self.se_backup_keys.addresses_derivation_map {
            if addr_derivation.pos > self.se_backup_keys.last_derived_pos {
                se_backup_keys_pos_encoded.push(addr_derivation.pos);
            }
        }
        let mut se_proof_keys_pos_encoded = Vec::new();
        for (_, key_derivation) in &self.se_proof_keys.key_derivation_map {
            if key_derivation.pos > self.se_proof_keys.last_derived_pos {
                se_proof_keys_pos_encoded.push(key_derivation.pos);
            }
        }
        let mut se_key_shares_pos_encoded = Vec::new();
        for (_, key_derivation) in &self.se_key_shares.key_derivation_map {
            if key_derivation.pos > self.se_key_shares.last_derived_pos {
                se_key_shares_pos_encoded.push(key_derivation.pos);
            }
        }
        json!({
            "id": self.id,
            "network": self.network,
            "master_priv_key": self.master_priv_key.to_string(),
            "keys_last_derived_pos": self.keys.last_derived_pos,
            "se_backup_keys_last_derived_pos": self.se_backup_keys.last_derived_pos,
            "se_backup_keys_pos_encoded": serde_json::to_string(&se_backup_keys_pos_encoded).unwrap(),
            "se_proof_keys_last_derivation_pos": self.se_proof_keys.last_derived_pos,
            "se_proof_keys_pos_encoded": serde_json::to_string(&se_proof_keys_pos_encoded).unwrap(),
            "se_key_shares_last_derivation_pos": self.se_key_shares.last_derived_pos,
            "se_key_shares_pos_encoded": serde_json::to_string(&se_key_shares_pos_encoded).unwrap(),
            // "shared_keys": serde_json::to_string(&self.shared_keys).unwrap(),
            "require_mainstay": self.require_mainstay
        })
    }

    /// load wallet from json
    pub fn from_json(
        json: serde_json::Value,
        client_shim: ClientShim,
        // electrumx_client: Box<dyn Electrumx>,
    ) -> Result<Self> {
        let secp = Secp256k1::new();
        let network = json["network"].as_str().unwrap().to_string();

        // master extended keys
        let mut master_priv_key =
            ExtendedPrivKey::from_str(json["master_priv_key"].as_str().unwrap()).unwrap();
        master_priv_key.network = network.parse::<Network>().unwrap();

        // keys
        let mut keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(0).unwrap())
            .unwrap();
        keys_master_ext_key.network = network.parse::<Network>().unwrap();
        let keys = KeyPathWithAddresses::new(keys_master_ext_key);

        // se_backup_keys
        let mut se_backup_keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(1).unwrap())
            .unwrap();
        se_backup_keys_master_ext_key.network = network.parse::<Network>().unwrap();
        let se_backup_keys = KeyPathWithAddresses::new(se_backup_keys_master_ext_key);

        // se_proof_keys
        let mut se_proof_keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(2).unwrap())
            .unwrap();
        se_proof_keys_master_ext_key.network = network.parse::<Network>().unwrap();
        let se_proof_keys = KeyPath::new(se_proof_keys_master_ext_key);

        // se_key_shares
        let mut se_key_shares_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(3).unwrap())
            .unwrap();
        se_key_shares_master_ext_key.network = network.parse::<Network>().unwrap();
        let se_key_shares = KeyPath::new(se_key_shares_master_ext_key);

        let mut wallet = Wallet {
            id: json["id"].as_str().unwrap().to_string(),
            network,
            secp,
            // electrumx_client,
            client_shim,
            master_priv_key,
            keys,
            se_backup_keys,
            se_proof_keys,
            se_key_shares,
            shared_keys: vec![],
            require_mainstay: json.get("require_mainstay").unwrap().as_bool().unwrap(),
        };

        // re-derive keys which have been previously derived
        for _ in 0..json["keys_last_derived_pos"].as_u64().unwrap() {
            wallet.keys.get_new_address()?;
        }
        for _ in 0..json["se_backup_keys_last_derived_pos"].as_u64().unwrap() {
            wallet.se_backup_keys.get_new_address()?;
        }
        for _ in 0..json["se_proof_keys_last_derivation_pos"].as_u64().unwrap() {
            wallet.se_proof_keys.get_new_key()?;
        }
        for _ in 0..json["se_key_shares_last_derivation_pos"].as_u64().unwrap() {
            wallet.se_key_shares.get_new_key()?;
        }

        let se_backup_keys_pos_str = json["se_backup_keys_pos_encoded"].as_str().unwrap();
        if se_backup_keys_pos_str.len() != 2 {
            // is not empty
            let se_backup_keys_pos: Vec<u32> =
                serde_json::from_str(se_backup_keys_pos_str).unwrap();
            for pos in se_backup_keys_pos {
                wallet.se_backup_keys.get_new_address_encoded_id(pos)?;
            }
        }

        let se_proof_keys_pos_str = json["se_proof_keys_pos_encoded"].as_str().unwrap();
        if se_proof_keys_pos_str.len() != 2 {
            // is not empty
            let se_proof_keys_pos: Vec<u32> = serde_json::from_str(se_proof_keys_pos_str).unwrap();
            for pos in se_proof_keys_pos {
                wallet.se_proof_keys.get_new_key_encoded_id(pos)?;
            }
        }

        let se_key_shares_pos_str = json["se_key_shares_pos_encoded"].as_str().unwrap();
        if se_key_shares_pos_str.len() != 2 {
            // is not empty
            let se_key_shares_pos: Vec<u32> = serde_json::from_str(se_key_shares_pos_str).unwrap();
            for pos in se_key_shares_pos {
                wallet.se_key_shares.get_new_key_encoded_id(pos)?;
            }
        }

        let shared_keys_str = &json["shared_keys"].as_str().unwrap();
        // if shared_keys_str.len() != 2 {
        //     // is not empty
        //     let shared_keys: Vec<SharedKey> = serde_json::from_str(shared_keys_str).unwrap();
        //     wallet.shared_keys = shared_keys;
        // }

        debug!("(wallet id: {}) Loaded wallet to memory", wallet.id);
        Ok(wallet)
    }

    /// save to disk
    pub fn save_to(&self, filepath: &str) {
        let wallet_json = self.to_json().to_string();
        fs::write(filepath, wallet_json).expect("Unable to save wallet!");
        debug!("(wallet id: {}) Saved wallet to disk", self.id);
    }
    pub fn save(&self) {
        self.save_to(WALLET_FILENAME)
    }

    /// load wallet from disk
    pub fn load_from(
        filepath: &str,
        client_shim: ClientShim,
        // electrumx_client: Box<dyn Electrumx>,
    ) -> Result<Wallet> {
        let data = fs::read_to_string(filepath).expect("Unable to load wallet!");
        let serde_json_data = serde_json::from_str(&data).unwrap();
        let wallet: Wallet = Wallet::from_json(serde_json_data, client_shim)?;
        // let wallet: Wallet = Wallet::from_json(serde_json_data, client_shim, electrumx_client)?;
        debug!("(wallet id: {}) Loaded wallet to memory", wallet.id);
        Ok(wallet)
    }
    pub fn load(
        client_shim: ClientShim,
        // electrumx_client: Box<dyn Electrumx>
    ) -> Result<Wallet> {
        Ok(Wallet::load_from(
            WALLET_FILENAME,
            client_shim,
            // electrumx_client,
        )?)
    }

    /// Select unspent coins greedily. Return TxIns along with corresponding spending addresses and amounts
    // pub fn coin_selection_greedy(
    //     &mut self,
    //     amount: &u64,
    // ) -> Result<(Vec<TxIn>, Vec<Address>, Vec<u64>)> {
    //     // Greedy coin selection.
    //     let (unspent_addrs, unspent_utxos) = self.list_unspent();
    //     let mut inputs: Vec<TxIn> = vec![];
    //     let mut addrs: Vec<Address> = vec![]; // corresponding addresses for inputs
    //     let mut amounts: Vec<u64> = vec![]; // corresponding amounts for inputs
    //     for (i, addr) in unspent_addrs.into_iter().enumerate() {
    //         for unspent_utxo in unspent_utxos.get(i).unwrap() {
    //             inputs.push(basic_input(
    //                 &unspent_utxo.tx_hash,
    //                 &(unspent_utxo.tx_pos as u32),
    //             ));
    //             addrs.push(addr.clone());
    //             amounts.push(unspent_utxo.value as u64);
    //             if *amount <= amounts.iter().sum::<u64>() {
    //                 return Ok((inputs, addrs, amounts));
    //             }
    //         }
    //     }
    //     return Err(CError::WalletError(WalletErrorType::NotEnoughFunds));
    // }

    pub fn get_new_state_entity_address(&mut self, funding_txid: &String) -> Result<SCEAddress> {
        let tx_backup_addr = self
            .se_backup_keys
            .get_new_address_encoded_id(funding_txid_to_int(funding_txid)?)?;
        let proof_key = self
            .se_proof_keys
            .get_new_key_encoded_id(funding_txid_to_int(funding_txid)?)?;
        let proof_key = bitcoin::secp256k1::PublicKey::from_slice(&proof_key.to_bytes().as_slice())?;
        Ok(SCEAddress {
            tx_backup_addr,
            proof_key,
        })
    }

    /// Sign inputs with given addresses derived by this wallet. input_indices, addresses and amoumts lists
    /// must be in order of appearance in TxIn[] list
    pub fn sign_tx(
        &mut self,
        transaction: &bitcoin::Transaction,
        input_indices: &Vec<usize>,
        addresses: &Vec<bitcoin::Address>,
        amounts: &Vec<u64>,
    ) -> bitcoin::Transaction {
        let mut signed_transaction = transaction.clone();
        for (iter, input_index) in input_indices.iter().enumerate() {
            // get key corresponding to address
            let address = addresses.get(iter).unwrap();
            let key_derivation = self
                .keys
                .get_address_derivation(&address.to_string())
                .ok_or(CError::WalletError(WalletErrorType::KeyNotFound))
                .unwrap();
            let pk = key_derivation.public_key.unwrap().key;
            let sk = key_derivation.private_key.key;

            let sig_hash = get_sighash(
                &transaction,
                &input_index,
                &pk,
                &amounts[iter],
                &self.network,
            );

            let msg = Message::from_slice(&sig_hash).unwrap();
            let signature = self.secp.sign(&msg, &sk).serialize_der();

            let mut with_hashtype = signature.to_vec();
            with_hashtype.push(1);
            signed_transaction.input[*input_index].witness.clear();
            signed_transaction.input[*input_index]
                .witness
                .push(with_hashtype);
            signed_transaction.input[*input_index]
                .witness
                .push(pk.serialize().to_vec());
        }
        return signed_transaction;
    }

    pub fn decrypt<T: WalletDecryptable>(&self, val: &mut T) -> ecies::Result<()>{
        match val.get_public_key()? {
            Some(k) => {
                self.decrypt_from_pub(val, &k)
            },
            None => Err(CError::Generic("item to be decrypted has no public key".to_string()).into())
        }
    }

    pub fn decrypt_from_pub<T: SelfEncryptable>
        (&self, val: &mut T, k: &PublicKey) -> ecies::Result<()>{
            match self.se_proof_keys.get_key_derivation(k){
                Some(p) => {
                    let priv_k = p.private_key;
                    val.decrypt(&priv_k)
                },
                None =>  Err(CError::WalletError(WalletErrorType::KeyNotFound).into())
            }
    }

    /// create new 2P-ECDSA key with state entity
    pub fn gen_shared_key(&mut self, id: &Uuid, value: &u64) -> Result<&SharedKey> {
        let key_share_pub = self.se_key_shares.get_new_key()?;
        let key_share_priv = self
            .se_key_shares
            .get_key_derivation(&key_share_pub)
            .unwrap()
            .private_key
            .key;

        let shared_key = SharedKey::new(
            id,
            &self.client_shim,
            &key_share_priv,
            value,
            Protocol::Deposit,
        )?;
        self.shared_keys.push(shared_key);
        Ok(self.shared_keys.last().unwrap())
    }

    /// create new 2P-ECDSA key with pre-definfed private key
    pub fn gen_shared_key_fixed_secret_key(
        &mut self,
        id: &Uuid,
        secret_key: &SecretKey,
        value: &u64,
    ) -> Result<()> {
        self.shared_keys.push(SharedKey::new(
            id,
            &self.client_shim,
            secret_key,
            value,
            Protocol::Transfer,
        )?);
        Ok(())
    }

    /// Get shared key by id. Return None if no shared key with given id.
    pub fn get_shared_key(&self, id: &Uuid) -> Result<&SharedKey> {
        for shared in &self.shared_keys {
            if shared.id == *id {
                return Ok(shared);
            }
        }
        Err(CError::WalletError(WalletErrorType::SharedKeyNotFound))
    }

    /// Get unspent shared key by state chain id. Return Err if no shared key with given state chain id.
    pub fn get_shared_key_by_state_chain_id(&self, state_chain_id: &Uuid) -> Result<&SharedKey> {
        for shared in &self.shared_keys {
            if shared.state_chain_id == Some(state_chain_id.to_owned()) {
                if shared.unspent == true {
                    return Ok(shared);
                }
            }
        }
        // If not found return shared key marked as spent.
        // This is temporary until we get smarter shared_key.unspent implemented with arrival
        // of watcher to check transfer status of StateChains.
        // At the moment wallet marks shared_keys as spent when transfer_sender() completes so we
        // cannot test for 'StateChain locked/spent' error messages without below code
        for shared in &self.shared_keys {
            if shared.state_chain_id == Some(state_chain_id.to_owned()) {
                return Ok(shared);
            }
        }
        Err(CError::WalletError(WalletErrorType::StateChainNotFound))
    }

    /// Return Shared key info: StateChain ID, Funding Txid, proof key, value, unspent
    pub fn get_shared_key_info(&self, id: &Uuid) -> Result<(Uuid, String, String, u64, bool)> {
        let shared_key = self.get_shared_key(id)?;
        Ok((
            shared_key.state_chain_id.clone().unwrap(),
            shared_key
                .tx_backup_psm
                .clone()
                .unwrap()
                .tx
                .input
                .get(0)
                .unwrap()
                .previous_output
                .txid
                .to_string(),
            shared_key.proof_key.clone().unwrap(),
            shared_key.value.clone(),
            shared_key.unspent,
        ))
    }

    /// Get mutable reference to shared key by id. Return None if no shared key with given id.
    pub fn get_shared_key_mut(&mut self, id: &Uuid) -> Result<&mut SharedKey> {
        for shared in &mut self.shared_keys {
            if shared.id == *id {
                return Ok(shared);
            }
        }
        Err(CError::WalletError(WalletErrorType::SharedKeyNotFound))
    }

    /// return balance of address
    // fn get_address_balance(&mut self, address: &bitcoin::Address) -> GetBalanceResponse {
    //     // self.electrumx_client
    //     //     .get_balance(&address.to_string())
    //     //     .unwrap()
    //     GetBalanceResponse{
    //         confirmed: 1,
    //         unconfirmed: 1
    //     }
    // }

    // fn zero_balance(&self, addr: &GetBalanceResponse) -> bool {
    //     if addr.confirmed == 0 {
    //         if addr.unconfirmed == 0 {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    /// return list of all addresses derived from keys in wallet
    pub fn get_all_wallet_addresses(&self) -> Vec<bitcoin::Address> {
        let mut addresses = self.keys.get_all_addresses();
        addresses.append(&mut self.se_backup_keys.get_all_addresses());
        addresses
    }

    // pub fn get_all_addresses_balance(
    //     &mut self,
    // ) -> (Vec<bitcoin::Address>, Vec<GetBalanceResponse>) {
    //     let all_addrs = self.get_all_wallet_addresses();
    //     let all_bals: Vec<GetBalanceResponse> = all_addrs
    //         .clone()
    //         .into_iter()
    //         .map(|a| self.get_address_balance(&a))
    //         .collect();
    //
    //     // return non-0 balances
    //     let mut addrs: Vec<bitcoin::Address> = vec![];
    //     let mut bals: Vec<GetBalanceResponse> = vec![];
    //     for (i, balance) in all_bals.into_iter().enumerate() {
    //         if !self.zero_balance(&balance) {
    //             addrs.push(all_addrs.get(i).unwrap().clone());
    //             bals.push(balance);
    //         }
    //     }
    //     (addrs, bals)
    // }

    /// Return total balance of addresses in wallet.
    // pub fn get_balance(&mut self) -> GetBalanceResponse {
    //     let mut aggregated_balance = GetBalanceResponse {
    //         confirmed: 0,
    //         unconfirmed: 0,
    //     };
    //     for b in self.get_all_addresses_balance().1 {
    //         aggregated_balance.unconfirmed += b.unconfirmed;
    //         aggregated_balance.confirmed += b.confirmed;
    //     }
    //     aggregated_balance
    // }

    /// Return balances of unspent state chains
    // pub fn get_state_chains_info(&self) -> (Vec<Uuid>, Vec<Uuid>, Vec<GetBalanceResponse>) {
    //     let mut shared_key_ids: Vec<Uuid> = vec![];
    //     let mut state_chain_ids: Vec<Uuid> = vec![];
    //     let mut state_chain_balances: Vec<GetBalanceResponse> = vec![];
    //     for shared_key in &self.shared_keys {
    //         if shared_key.unspent {
    //             state_chain_balances.push(GetBalanceResponse {
    //                 confirmed: shared_key.value,
    //                 unconfirmed: 0,
    //             });
    //             shared_key_ids.push(shared_key.id.to_owned());
    //             if shared_key.state_chain_id.is_some() {
    //                 state_chain_ids.push(shared_key.state_chain_id.clone().unwrap());
    //             }
    //         }
    //     }
    //     (shared_key_ids, state_chain_ids, state_chain_balances)
    // }

    /// List unspent outputs for addresses derived by this wallet.
    // pub fn list_unspent(&mut self) -> (Vec<bitcoin::Address>, Vec<Vec<GetListUnspentResponse>>) {
    //     let addresses = self.get_all_wallet_addresses();
    //     let mut unspent_list: Vec<Vec<GetListUnspentResponse>> = vec![];
    //     for addr in &addresses {
    //         let addr_unspent_list = self.list_unspent_for_address(addr.to_string());
    //         unspent_list.push(addr_unspent_list);
    //     }
    //     (addresses, unspent_list)
    // }

    // fn list_unspent_for_address(&mut self, address: String) -> Vec<GetListUnspentResponse> {
    //     let resp = self.electrumx_client.get_list_unspent(&address).unwrap();
    //     resp
    // }

    pub fn to_p2wpkh_address(&self, pub_key: &PublicKey) -> Result<bitcoin::Address> {
        bitcoin::Address::p2wpkh(
            &to_bitcoin_public_key(pub_key.key),
            self.get_bitcoin_network(),
         ).map_err(|e| e.into())
    }

    pub fn get_bitcoin_network(&self) -> Network {
        self.network.parse::<Network>().unwrap()
    }
}

// fn basic_input(txid: &String, vout: &u32) -> TxIn {
//     TxIn {
//         previous_output: OutPoint {
//             txid: bitcoin::Txid::from_str(txid).unwrap(),
//             vout: *vout,
//         },
//         sequence: 0xFFFFFFFF,
//         witness: Vec::new(),
//         script_sig: bitcoin::Script::default(),
//     }
// }

// type conversion
pub fn to_bitcoin_public_key(pk: curv::PK) -> bitcoin::util::key::PublicKey {
    bitcoin::util::key::PublicKey {
        compressed: true,
        key: pk,
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    extern crate shared_lib;
    // use shared_lib::mocks::mock_electrum::MockElectrum;

    fn gen_wallet() -> Wallet {
        // let electrum = ElectrumxClient::new("dummy").unwrap();
        let mut wallet = Wallet::new(
            &[0xcd; 32],
            &"regtest".to_string(),
            ClientShim::new("http://localhost:8000".to_string(), None),
            // ClientShim::new("http://localhost:8000".to_string(), None, None),
            // Box::new(MockElectrum::new()),
        );
        let _ = wallet.keys.get_new_address();
        let _ = wallet.keys.get_new_address();
        wallet
    }

    #[test]
    fn test_to_and_from_json() {
        let mut wallet = gen_wallet();

        let addr1 = wallet.keys.get_new_address().unwrap();
        let addr2 = wallet.keys.get_new_address().unwrap();
        let backup_addr1 = wallet.se_backup_keys.get_new_address().unwrap();
        let backup_addr2 = wallet.se_backup_keys.get_new_address().unwrap();
        let proof_key1 = wallet.se_proof_keys.get_new_key().unwrap();
        let proof_key2 = wallet.se_proof_keys.get_new_key().unwrap();
        let key_shares1 = wallet
            .se_key_shares
            .get_new_key_encoded_id(9999999)
            .unwrap();
        let key_shares2 = wallet.se_key_shares.get_new_key().unwrap();

        let wallet_json = wallet.to_json();

        let wallet_rebuilt = super::Wallet::from_json(
            wallet_json,
            ClientShim::new("http://localhost:8000".to_string(), None),
            // ClientShim::new("http://localhost:8000".to_string(), None, None),
            // Box::new(MockElectrum::new()),
        )
        .unwrap();

        assert_eq!(wallet.id, wallet_rebuilt.id);
        assert_eq!(wallet.network, wallet_rebuilt.network);
        assert_eq!(
            wallet.master_priv_key.chain_code,
            wallet_rebuilt.master_priv_key.chain_code
        );
        assert_eq!(
            wallet.master_priv_key.private_key.to_bytes(),
            wallet_rebuilt.master_priv_key.private_key.to_bytes()
        );

        assert_eq!(
            wallet.keys.ext_priv_key.private_key.to_bytes(),
            wallet_rebuilt.keys.ext_priv_key.private_key.to_bytes()
        );
        assert_eq!(
            wallet.keys.last_derived_pos,
            wallet_rebuilt.keys.last_derived_pos
        );
        assert!(wallet_rebuilt
            .keys
            .addresses_derivation_map
            .contains_key(&addr1.to_string()));
        assert!(wallet_rebuilt
            .keys
            .addresses_derivation_map
            .contains_key(&addr2.to_string()));

        assert_eq!(
            wallet.se_backup_keys.ext_priv_key.private_key.to_bytes(),
            wallet_rebuilt
                .se_backup_keys
                .ext_priv_key
                .private_key
                .to_bytes()
        );
        assert_eq!(
            wallet.se_backup_keys.last_derived_pos,
            wallet_rebuilt.se_backup_keys.last_derived_pos
        );
        assert!(wallet_rebuilt
            .se_backup_keys
            .addresses_derivation_map
            .contains_key(&backup_addr1.to_string()));
        assert!(wallet_rebuilt
            .se_backup_keys
            .addresses_derivation_map
            .contains_key(&backup_addr2.to_string()));

        assert_eq!(
            wallet.se_proof_keys.ext_priv_key.private_key.to_bytes(),
            wallet_rebuilt
                .se_proof_keys
                .ext_priv_key
                .private_key
                .to_bytes()
        );
        assert_eq!(
            wallet.se_proof_keys.last_derived_pos,
            wallet_rebuilt.se_proof_keys.last_derived_pos
        );
        assert!(wallet_rebuilt
            .se_proof_keys
            .key_derivation_map
            .contains_key(&proof_key1));
        assert!(wallet_rebuilt
            .se_proof_keys
            .key_derivation_map
            .contains_key(&proof_key2));
        assert_eq!(
            wallet_rebuilt
                .se_proof_keys
                .get_key_derivation(&proof_key1)
                .unwrap()
                .pos,
            1
        );
        assert_eq!(
            wallet_rebuilt
                .se_proof_keys
                .get_key_derivation(&proof_key2)
                .unwrap()
                .pos,
            2
        );

        assert_eq!(
            wallet.se_key_shares.ext_priv_key.private_key.to_bytes(),
            wallet_rebuilt
                .se_key_shares
                .ext_priv_key
                .private_key
                .to_bytes()
        );
        assert_eq!(
            wallet.se_key_shares.last_derived_pos,
            wallet_rebuilt.se_key_shares.last_derived_pos
        );
        assert!(wallet_rebuilt
            .se_key_shares
            .key_derivation_map
            .contains_key(&key_shares1));
        assert!(wallet_rebuilt
            .se_key_shares
            .key_derivation_map
            .contains_key(&key_shares2));
        assert_eq!(
            wallet_rebuilt
                .se_key_shares
                .get_key_derivation(&key_shares1)
                .unwrap()
                .pos,
            9999999
        );
        assert_eq!(
            wallet_rebuilt
                .se_key_shares
                .get_key_derivation(&key_shares2)
                .unwrap()
                .pos,
            1
        );
    }

    // #[test]
    // fn test_coin_selection_greedy() {
    //     let mut wallet = gen_wallet();
    //     let _ = wallet.keys.get_new_address();
    //
    //     for amount in [10, 100, 10000000, 10000100].iter() {
    //         let selection = wallet.coin_selection_greedy(&amount).unwrap();
    //         assert_eq!(selection.0.len(), selection.1.len());
    //         assert_eq!(selection.0.len(), selection.2.len());
    //         assert!(selection.2.iter().sum::<u64>() >= *amount);
    //     }
    //
    //     // 10000100 is total amount in Mock Electrum
    //     let selection = wallet.coin_selection_greedy(&10000101);
    //     assert!(selection.is_err());
    // }

    #[test]
    fn test_decrypt() {
        use ecies::Encryptable;

        #[derive(Deserialize, Serialize, Debug, PartialEq, Clone)]
        struct TestStruct{
            first: String,
            second: String,
            pubk: ecies::PublicKey
        }

        impl Encryptable for TestStruct{}
        impl SelfEncryptable for TestStruct {
            fn encrypt_with_pubkey(&mut self, pubk: &ecies::PublicKey) -> ecies::Result<()> {
                self.first.encrypt_with_pubkey(pubk)

            }

            fn decrypt(&mut self, privk: &ecies::PrivateKey) -> ecies::Result<()> {
                self.first.decrypt(privk)
            }

        }
        impl WalletDecryptable for TestStruct {
            fn get_public_key(&self) -> ecies::Result<Option<ecies::PublicKey>>{
                Ok(Some(self.pubk.clone()))
            }
        }

        let mut wallet = gen_wallet();
        let pubk = wallet.se_proof_keys.get_new_key().unwrap();

        let mut my_struct = TestStruct{first: "str1".to_string(), second: "str2".to_string(), pubk};
        let my_struct_clone = my_struct.clone();
        assert_eq!(my_struct, my_struct_clone);
        //Encrypt the struct using its own public key
        my_struct.encrypt().unwrap();
        assert_ne!(my_struct, my_struct_clone);
        //Decrypt using the wallet
        wallet.decrypt(&mut my_struct).unwrap();
        assert_eq!(my_struct, my_struct_clone);

        //Encrypt/decrypt the struct, passing the public key explicitly
        my_struct.encrypt_with_pubkey(&pubk).unwrap();
        assert_ne!(my_struct, my_struct_clone);
        wallet.decrypt_from_pub(&mut my_struct, &pubk).unwrap();
        assert_eq!(my_struct, my_struct_clone);
    }
}
