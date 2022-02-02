// Mercury deposit protocol.

// deposit():
// 0. Initiate session - generate ID and perform authorisation
// 1. Generate shared wallet
// 2. Co-op sign back-up tx
// 3. Broadcast funding tx and wait for SE verification
// 4. Verify funding txid and proof key in SM


import { keyGen, PROTOCOL, sign } from "./ecdsa";
import { txBackupBuild, getRoot, verifySmtProof, getSmtProof, StateCoin, getFeeInfo, HttpClient, MockHttpClient, POST_ROUTE } from "../";
import { FeeInfo } from "./info_api";
import { getSigHash, pubKeyTobtcAddr } from "../util";

import { Network } from 'bitcoinjs-lib';
import { PrepareSignTxMsg } from "./ecdsa";
let typeforce = require('typeforce');


// Deposit Init. Generate shared key with stateChain Entity.
// Return Shared_key_id, statecoin and address to send funds to.
export const depositInit = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  proof_key: string,
  secret_key: string
): Promise<StateCoin> => {
  // Init. session - Receive shared wallet ID
  let deposit_msg1 = {
      auth: "authstr",
      proof_key: String(proof_key)
  };
  
  let deposit_init_res = await http_client.post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);
  let shared_key_id = deposit_init_res.id;
  typeforce(typeforce.String, shared_key_id)


  console.log("start pow");
  // solve VDF challenge
  let pow_solution = wasm_client.solve_pow_challenge(deposit_init_res.challenge);
  console.log(pow_solution);
  console.log("complete pow");

  // 2P-ECDSA with state entity to create a Shared key
  let statecoin = await keyGen(http_client, wasm_client, shared_key_id, secret_key, PROTOCOL.DEPOSIT, pow_solution);
  statecoin.is_deposited=true
  return statecoin
}

// After funds are sent to p_addr sign backup tx and verify SMT.
// Return statecoin with smt_proot, statechain_id, tx_backup_signed, p_addr.
export const depositConfirm = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  chaintip_height: number,
): Promise<StateCoin> => {
  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);
  let withdraw_fee = Math.floor((statecoin.value * fee_info.withdraw) / 10000);

  // Calculate initial locktime
  let init_locktime = (chaintip_height) + (fee_info.initlock);
  // if previously set (RBF) use initial height
  if (statecoin.init_locktime) {
    init_locktime = statecoin.init_locktime;
  } else {
    statecoin.init_locktime = init_locktime;
  }

  // Build unsigned backup tx
  let backup_receive_addr = pubKeyTobtcAddr(statecoin.proof_key, network);
  let txb_backup_unsigned = txBackupBuild(network, statecoin.funding_txid, statecoin.funding_vout, backup_receive_addr, statecoin.value, fee_info.address, withdraw_fee, init_locktime);
  let tx_backup_unsigned = txb_backup_unsigned.buildIncomplete();

  //co sign funding tx input signatureHash
  let pk = statecoin.getSharedPubKey();
  let signatureHash = getSigHash(tx_backup_unsigned, 0, pk, statecoin.value, network);

  // ** Can remove PrepareSignTxMsg and replace with backuptx throughout client and server?
  // Create PrepareSignTxMsg to send funding tx data to receiver
  let prepare_sign_msg: PrepareSignTxMsg = {
    shared_key_ids: [statecoin.shared_key_id],
    protocol: PROTOCOL.DEPOSIT,
    tx_hex: tx_backup_unsigned.toHex(),
    input_addrs: [pk],
    input_amounts: [statecoin.value],
    proof_key: statecoin.proof_key,
  };

  // construct shared signatures
  let signature = await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, prepare_sign_msg, signatureHash, PROTOCOL.DEPOSIT);
  

  // set witness data with signature
  let tx_backup_signed = tx_backup_unsigned;

  tx_backup_signed.ins[0].witness = [Buffer.from(signature[0]),Buffer.from(signature[1])];

  prepare_sign_msg.tx_hex = tx_backup_signed.toHex();

  // Wait for server confirmation of funding tx and receive new StateChain's id
  let deposit_msg2 = {
      shared_key_id: statecoin.shared_key_id,
  }

  let statechain_id = await http_client.post(POST_ROUTE.DEPOSIT_CONFIRM, deposit_msg2);

  typeforce(typeforce.String, statecoin.shared_key_id)

  // Verify proof key inclusion in SE sparse merkle tree
  let root = await getRoot(http_client);
  let proof = await getSmtProof(http_client, root, statecoin.funding_txid);

  // Add proof and state chain id to Shared key
  statecoin.smt_proof = proof;
  statecoin.statechain_id = statechain_id.id;
  statecoin.tx_backup = tx_backup_signed;
  statecoin.interval = fee_info.interval;
  statecoin.is_deposited = true

  return statecoin
}
