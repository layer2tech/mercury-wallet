// Withdraw

import { BIP32Interface, Network, Transaction } from "bitcoinjs-lib";
import { getFeeInfo, HttpClient, MockHttpClient, POST_ROUTE, StateCoin } from "..";
import { PrepareSignTxMsg } from "./ecdsa";
import { getSigHash, StateChainSig, txWithdrawBuildBatch } from "../util";
import { PROTOCOL, sign } from "./ecdsa";
import { FeeInfo, getStateChain, StateChainDataAPI } from "./info_api";

// withdraw() messages:
// 0. request withdraw and provide withdraw tx data
// 1. Sign state chain and request withdrawal
// 2. Co-sign withdraw tx
// 3. Broadcast withdraw tx


// Withdraw coins from state entity. Returns signed withdraw transaction
export const withdraw = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoins: [StateCoin],
  proof_key_ders: [BIP32Interface],
  rec_addr: string
): Promise<Transaction> => {

  let sc_infos: StateChainDataAPI[] = [];
  let pks: any[] = [];
  let statechain_sigs: StateChainSig[] = [];
  let shared_key_ids: string[] = [];
  let shared_keys: any[] = [];
  let amounts: number[] = [];
  let amount = 0;

  statecoins.forEach(async (statecoin: StateCoin, index: number) => {
    let proof_key_der: BIP32Interface = proof_key_ders[index];
    // Get statechain from SE and check ownership
    let statechain: StateChainDataAPI = await getStateChain(http_client, statecoin.statechain_id);
    sc_infos.push(statechain);
    if (statechain.amount === 0) throw Error("StateChain " + statecoin.statechain_id + " already withdrawn.");
    if (statechain.chain.pop().data !== statecoin.proof_key) throw Error("StateChain not owned by this Wallet. Incorrect proof key.");

    // Sign statecoin to signal desire to Withdraw
    let statechain_sig = StateChainSig.create(proof_key_der, "WITHDRAW", rec_addr);
    statechain_sigs.push(statechain_sig);
    shared_key_ids.push(statecoin.shared_key_id)

    amount = amount + statecoin.value;
    amounts.push(statecoin.value);
    pks.push(statecoin.getSharedPubKey());
    shared_keys.push(statecoin.shared_key);
  });

  // Alert SE of desire to withdraw and receive authorisation if state chain signature verifies
  let withdraw_msg_1 = {
    shared_key_ids: shared_key_ids,
    statechain_sigs: statechain_sigs
  }

  await http_client.post(POST_ROUTE.WITHDRAW_INIT, withdraw_msg_1);

  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);

  // Construct withdraw tx
  let txb_withdraw_unsigned = txWithdrawBuildBatch(network, sc_infos, rec_addr, fee_info);
  
  //txWithdrawBuild(
//    network,
    //statecoin.funding_txid,
    //statecoin.funding_vout,
    //rec_addr,
    //statecoin.value,
    //fee_info.address,
    //withdraw_fee
  //);
  let tx_withdraw_unsigned = txb_withdraw_unsigned.buildIncomplete();

  let signatureHashes: string[] = [];

  // tx_withdraw_unsigned
  sc_infos.forEach((info, index) => {
    signatureHashes.push(getSigHash(tx_withdraw_unsigned, 0, pks[index], info.value, network));
  });
  
  // ** Can remove PrepareSignTxMsg and replace with backuptx throughout client and server?
  // Create PrepareSignTxMsg to send funding tx data to receiver
  let prepare_sign_msg: PrepareSignTxMsg = {
    shared_key_ids: shared_key_ids,
    protocol: PROTOCOL.WITHDRAW,
    tx_hex: tx_withdraw_unsigned.toHex(),
    input_addrs: pks,
    input_amounts: amounts,
    proof_key: null,
  };

  //await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, prepare_sign_msg, signatureHash, PROTOCOL.WITHDRAW);
  await sign(http_client, wasm_client, shared_key_ids, shared_keys, prepare_sign_msg, signatureHashes, PROTOCOL.WITHDRAW);

  // Complete confirm to get witness
  let withdraw_msg_2 = {
      shared_key_ids: shared_key_ids,
      address: rec_addr
  }

  let signatures: any[] = await http_client.post(POST_ROUTE.WITHDRAW_CONFIRM, withdraw_msg_2);

  // set witness data with signature
  let tx_backup_signed = tx_withdraw_unsigned;

  signatures.forEach((signature, index) => {
    tx_backup_signed.ins[index].witness = [Buffer.from(signature[0][0]),Buffer.from(signature[0][1])];
  });
  

  return tx_backup_signed
}
