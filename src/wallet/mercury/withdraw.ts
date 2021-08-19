// Withdraw

import { BIP32Interface, Network, Transaction } from "bitcoinjs-lib";
import { getFeeInfo, HttpClient, MockHttpClient, POST_ROUTE, StateCoin } from "..";
import { PrepareSignTxMsg } from "./ecdsa";
import { getSigHash, StateChainSig, txWithdrawBuildBatch, txWithdrawBuild } from "../util";
import { PROTOCOL, sign, sign_batch } from "./ecdsa";
import { FeeInfo, getStateChain, StateChainDataAPI } from "./info_api";

// withdraw() messages:
// 0. request withdraw and provide withdraw tx data
// 1. Sign state chain and request withdrawal
// 2. Co-sign withdraw tx
// 3. Broadcast withdraw tx


// Withdraw coins from state entity. Returns signed withdraw transaction
export const withdraw = async (
  http_client: HttpClient |  MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoins: StateCoin[],
  proof_key_ders: BIP32Interface[],
  rec_addr: string,
  fee_per_kb: number
): Promise<Transaction> => {

  let sc_infos: StateChainDataAPI[] = [];
  let pks: any[] = [];
  let statechain_sigs: StateChainSig[] = [];
  let shared_key_ids: string[] = [];
  let shared_keys: any[] = [];
  let amounts: number[] = [];
  let amount = 0;
  let index = 0;


    for (const sc of statecoins) {
    if (sc.funding_txid == null) {
      throw Error("StateChain undefined already withdrawn.");
    }

    let statecoin: StateCoin = sc;

    let proof_key_der: BIP32Interface = proof_key_ders[index];
    // Get statechain from SE and check ownership
    let statechain: StateChainDataAPI = await getStateChain(http_client, statecoin.statechain_id);
    sc_infos.push(statechain);

    if (statechain.amount === 0) {
      throw Error("StateChain " + statecoin.statechain_id + " already withdrawn.");
    }

    let chain_data = statechain.chain.pop().data;
    if (chain_data !== statecoin.proof_key) {
      throw Error("StateChain not owned by this Wallet. Incorrect proof key. Expected " + statecoin.proof_key + ", got " + chain_data);
    }

    // Sign statecoin to signal desire to Withdraw
    let statechain_sig = StateChainSig.create(proof_key_der, "WITHDRAW", rec_addr);
    statechain_sigs.push(statechain_sig);
    shared_key_ids.push(statecoin.shared_key_id)

    amount = amount + statecoin.value;
    amounts.push(statecoin.value);
    pks.push(statecoin.getSharedPubKey());
    shared_keys.push(statecoin.shared_key);
    index = index + 1;
  }


  // Alert SE of desire to withdraw and receive authorisation if state chain signature verifies
  let withdraw_msg_1 = {
    shared_key_ids: shared_key_ids,
    statechain_sigs: statechain_sigs
  }

  await http_client.post(POST_ROUTE.WITHDRAW_INIT, withdraw_msg_1);

  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);

  // Construct withdraw tx
  let txb_withdraw_unsigned;

  if(statecoins.length > 1) {
      txb_withdraw_unsigned = txWithdrawBuildBatch(network, sc_infos, rec_addr, fee_info,fee_per_kb)
  } else {
      let statecoin = statecoins[0];
      let withdraw_fee = (statecoin.value * fee_info.withdraw) / 10000;
      txb_withdraw_unsigned = txWithdrawBuild(
            network,
            statecoin.funding_txid,
            statecoin.funding_vout,
            rec_addr,
            statecoin.value,
            fee_info.address,
            withdraw_fee,
            fee_per_kb
          );
  }

  let tx_withdraw_unsigned = txb_withdraw_unsigned.buildIncomplete();

  let signatureHashes: string[] = [];

  // tx_withdraw_unsigned
  sc_infos.forEach((info, index) => {
    let pk = pks[index];
    signatureHashes.push(getSigHash(tx_withdraw_unsigned, index, pk, info.amount, network));
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

  if(shared_key_ids.length === 1) {
    //await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, prepare_sign_msg, signatureHash, PROTOCOL.WITHDRAW);
    await sign(http_client, wasm_client, shared_key_ids[0], shared_keys[0], prepare_sign_msg, signatureHashes[0], PROTOCOL.WITHDRAW);
  } else {
    await sign_batch(http_client, wasm_client, shared_key_ids, shared_keys, prepare_sign_msg, signatureHashes, PROTOCOL.WITHDRAW);
  }
  // Complete confirm to get witness
  let withdraw_msg_2 = {
      shared_key_ids: shared_key_ids,
      address: rec_addr
  }

  let signatures: any[][] = await http_client.post(POST_ROUTE.WITHDRAW_CONFIRM, withdraw_msg_2);

  // set witness data with signature
  let tx_backup_signed = tx_withdraw_unsigned;

  signatures.forEach((signature, index) => {
    let sig0 = signatures[index][0];
    let sig1 = signatures[index][1];
    tx_backup_signed.ins[index].witness = [Buffer.from(sig0),Buffer.from(sig1)];
  });

  return tx_backup_signed
}
