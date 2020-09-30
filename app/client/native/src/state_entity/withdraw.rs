//! Withdraw
//!
//! Withdraw funds from the state entity

// withdraw() messages:
// 0. request withdraw and provide withdraw tx data
// 1. Sign state chain and request withdrawal
// 2. Co-sign withdraw tx
// 3. Broadcast withdraw tx

use super::super::Result;
extern crate shared_lib;
use shared_lib::{
    state_chain::StateChainSig,
    structs::{PrepareSignTxMsg, Protocol, StateChainDataAPI, WithdrawMsg1, WithdrawMsg2},
    util::tx_withdraw_build,
};

use super::api::{get_statechain, get_statechain_fee_info};
use crate::error::{CError, WalletErrorType};
use crate::state_entity::util::cosign_tx_input;
use crate::utilities::requests;
use crate::wallet::wallet::Wallet;

use bitcoin::{consensus, PublicKey};
use curv::elliptic::curves::traits::ECPoint;

use std::str::FromStr;
use uuid::Uuid;

/// Withdraw coins from state entity. Returns signed withdraw transaction, state_chain_id and withdrawn amount.
pub fn withdraw(wallet: &mut Wallet, state_chain_id: &Uuid) -> Result<(String, Uuid, u64)> {
    // first get required shared key data
    let shared_key_id;
    let pk;
    {
        let shared_key = wallet.get_shared_key_by_state_chain_id(state_chain_id)?;
        pk = shared_key.share.public.q.get_element();
        shared_key_id = shared_key.id.clone();
    }

    // Generate receiving address of withdrawn funds
    let rec_address = wallet.keys.get_new_address()?;

    // Sign state chain
    let state_chain_data: StateChainDataAPI = get_statechain(&wallet.client_shim, &state_chain_id)?;
    if state_chain_data.amount == 0 {
        return Err(CError::StateEntityError(String::from(
            "Withdraw: StateChain is already withdrawn.",
        )));
    }
    let state_chain = state_chain_data.chain;
    // get proof key for signing
    let proof_key_derivation = wallet
        .se_proof_keys
        .get_key_derivation(&PublicKey::from_str(&state_chain.last().unwrap().data).unwrap())
        .ok_or(CError::WalletError(WalletErrorType::KeyNotFound));
    let state_chain_sig = StateChainSig::new(
        &proof_key_derivation.unwrap().private_key.key,
        &String::from("WITHDRAW"),
        &rec_address.to_string(),
    )?;

    // Alert SE of desire of withdraw and receive authorisation if state chain signature verifies
    requests::postb(
        &wallet.client_shim,
        &format!("withdraw/init"),
        &WithdrawMsg1 {
            shared_key_id: shared_key_id.clone(),
            state_chain_sig,
        },
    )?;

    // Get state chain info
    let sc_info = get_statechain(&wallet.client_shim, &state_chain_id)?;
    // Get state entity withdraw fee info
    let se_fee_info = get_statechain_fee_info(&wallet.client_shim)?;

    // Construct withdraw tx
    let tx_withdraw_unsigned = tx_withdraw_build(
        &sc_info.utxo.txid,
        &rec_address,
        &(sc_info.amount + se_fee_info.deposit),
        &se_fee_info.withdraw,
        &se_fee_info.address,
    )?;

    // co-sign withdraw tx
    let tx_w_prepare_sign_msg = PrepareSignTxMsg {
        shared_key_id: shared_key_id.to_owned(),
        protocol: Protocol::Withdraw,
        tx: tx_withdraw_unsigned.clone(),
        input_addrs: vec![pk],
        input_amounts: vec![sc_info.amount],
        proof_key: None,
    };
    cosign_tx_input(wallet, &tx_w_prepare_sign_msg)?;

    let witness: Vec<Vec<u8>> = requests::postb(
        &wallet.client_shim,
        &format!("/withdraw/confirm"),
        &WithdrawMsg2 {
            shared_key_id: shared_key_id.to_owned(),
            address: rec_address.to_string(),
        },
    )?;

    let mut tx_withdraw_signed = tx_withdraw_unsigned.clone();
    tx_withdraw_signed.input[0].witness = witness;

    // Mark funds as withdrawn in wallet
    {
        let mut shared_key = wallet.get_shared_key_mut(&shared_key_id)?;
        shared_key.unspent = false;
    }

    // // Broadcast transcation
    // let withdraw_txid = wallet
    //     .electrumx_client
    //     .broadcast_transaction(hex::encode(consensus::serialize(&tx_withdraw_signed)))?;
    // debug!("Deposit: Funding tx broadcast. txid: {}", withdraw_txid);
    let withdraw_txid = String::from("withdraw txid dummy");

    Ok((
        withdraw_txid,
        state_chain_id.clone(),
        state_chain_data.amount - se_fee_info.withdraw,
    ))
}
