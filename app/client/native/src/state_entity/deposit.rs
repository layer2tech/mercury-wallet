//! Deposit
//!
//! Deposit coins into state entity

// deposit():
// 0. Initiate session - generate ID and perform authorisation
// 1. Generate shared wallet
// 2. Co-op sign back-up tx
// 3. Broadcast funding tx and wait for SE verification
// 4. Verify funding txid and proof key in SM

use super::super::Result;
extern crate shared_lib;
use shared_lib::structs::{DepositMsg1, DepositMsg2, PrepareSignTxMsg, Protocol};
use shared_lib::util::{tx_backup_build, tx_funding_build, FEE};

use super::api::{get_smt_proof, get_smt_root, get_statechain_fee_info};
use crate::error::{CError, WalletErrorType};
use crate::state_entity::util::{cosign_tx_input, verify_statechain_smt};
use crate::utilities::requests;
use crate::wallet::wallet::{to_bitcoin_public_key, Wallet};

use bitcoin::{consensus, PublicKey, Transaction};
use curv::elliptic::curves::traits::ECPoint;
use uuid::Uuid;
use std::str::FromStr;

/// Message to server initiating state entity protocol.
/// Shared wallet ID returned
pub fn session_init(wallet: &mut Wallet, proof_key: &String) -> Result<Uuid> {
    requests::postb(
        &wallet.client_shim,
        &format!("deposit/init"),
        &DepositMsg1 {
            auth: "auth".to_string(),
            proof_key: proof_key.to_owned(),
        },
    )
}

/// Deposit coins into state entity. Returns shared_key_id, state_chain_id, funding txid,
/// signed backup tx, back up transacion data and proof_key
pub fn deposit(
    wallet: &mut Wallet,
    amount: &u64,
) -> Result<(Uuid, Uuid, String, Transaction, PrepareSignTxMsg, PublicKey)> {
    // Get state entity fee info
    let se_fee_info = get_statechain_fee_info(&wallet.client_shim)?;

    // Ensure funds cover fees before initiating protocol
    if FEE + se_fee_info.deposit >= *amount {
        return Err(CError::WalletError(WalletErrorType::NotEnoughFunds));
    }

    // Greedy coin selection.
    // let (inputs, addrs, amounts) =
    //     wallet.coin_selection_greedy(&(amount + se_fee_info.deposit + FEE))?;

    // Generate proof key
    let proof_key = wallet.se_proof_keys.get_new_key()?;

    // Init. session - Receive shared wallet ID
    let shared_key_id: Uuid = session_init(wallet, &proof_key.to_string())?;

    // 2P-ECDSA with state entity to create a Shared key
    let shared_key = wallet.gen_shared_key(&shared_key_id, amount)?;

    // Create funding tx
    let pk = shared_key.share.public.q.get_element(); // co-owned key address to send funds to (P_addr)
    let p_addr = bitcoin::Address::p2wpkh(&to_bitcoin_public_key(pk), wallet.get_bitcoin_network())?;
    // let change_addr = wallet.keys.get_new_address()?.to_string();
    // let change_amount = amounts.iter().sum::<u64>() - amount - se_fee_info.deposit - FEE;
    // let tx_0 = tx_funding_build(
    //     &inputs,
    //     &p_addr.to_string(),
    //     amount,
    //     &se_fee_info.deposit,
    //     &se_fee_info.address,
    //     &change_addr,
    //     &change_amount,
    // )?;


    // let tx_funding_signed = wallet.sign_tx(
    //     &tx_0,
    //     &(0..inputs.len()).collect(), // inputs to sign are all inputs is this case
    //     &addrs,
    //     &amounts,
    // );

    let funding_txid_dummy = String::from("0158f2978e5c2cf407970d7213f2b4289993b2fe3ef6aca531316cdcf347cc41");


    // Make unsigned backup tx
    let backup_receive_addr = wallet.se_backup_keys.get_new_address()?;
    let tx_backup_unsigned =
        tx_backup_build(&bitcoin::Txid::from_str(&funding_txid_dummy).unwrap(), &backup_receive_addr, &amount)?;

    // Co-sign tx backup tx
    let tx_backup_psm = PrepareSignTxMsg {
        shared_key_id: shared_key_id.to_owned(),
        protocol: Protocol::Deposit,
        tx: tx_backup_unsigned.to_owned(),
        input_addrs: vec![pk],
        input_amounts: vec![*amount],
        proof_key: Some(proof_key.to_string()),
    };

    let witness = cosign_tx_input(wallet, &tx_backup_psm)?;


    // Add witness to back up tx
    let mut tx_backup_signed = tx_backup_unsigned.clone();
    tx_backup_signed.input[0].witness = witness;

    // TODO: check signature is valid?

    // Broadcast funding transcation
    // let funding_txid = wallet
    //     .electrumx_client
    //     .broadcast_transaction(hex::encode(consensus::serialize(&tx_funding_signed)))?;
    // debug!("Deposit: Funding tx broadcast. txid: {}", funding_txid);

    // Wait for server confirmation of funding tx and receive new StateChain's id
    let state_chain_id: Uuid = requests::postb(
        &wallet.client_shim,
        &format!("deposit/confirm"),
        &DepositMsg2 {
            shared_key_id: shared_key_id.to_owned(),
        },
    )?;

    // Verify proof key inclusion in SE sparse merkle tree
    let root = get_smt_root(&wallet.client_shim)?.unwrap();
    let proof = get_smt_proof(&wallet.client_shim, &root, &funding_txid_dummy)?;
    assert!(verify_statechain_smt(
        &Some(root.hash()),
        &proof_key.to_string(),
        &proof
    ));

    // Add proof and state chain id to Shared key
    {
        let shared_key = wallet.get_shared_key_mut(&shared_key_id)?;
        shared_key.state_chain_id = Some(state_chain_id);
        shared_key.tx_backup_psm = Some(tx_backup_psm.to_owned());
        shared_key.add_proof_data(&proof_key.to_string(), &root, &proof, &funding_txid_dummy);
    }


    Ok((
        shared_key_id,
        state_chain_id,
        funding_txid_dummy,
        tx_backup_signed,
        tx_backup_psm,
        proof_key,
    ))
}
