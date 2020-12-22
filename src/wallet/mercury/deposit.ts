// Mercury deposit protocol.

// deposit():
// 0. Initiate session - generate ID and perform authorisation
// 1. Generate shared wallet
// 2. Co-op sign back-up tx
// 3. Broadcast funding tx and wait for SE verification
// 4. Verify funding txid and proof key in SM


import { keyGen, PROTOCOL, sign } from "./ecdsa";
import { txBackupBuild, getRoot, verifySmtProof, getSmtProof, StateCoin, getFeeInfo, HttpClient, MockHttpClient, POST_ROUTE } from "../";
import { Network, Transaction } from 'bitcoinjs-lib';
import { FeeInfo } from "./info_api";

let typeforce = require('typeforce');


// Deposit Init. Generate shared key with stateChain Entity.
// Return Shared_key_id, statecoin and address to send funds to.
export const depositInit = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  proof_key: string,
  secret_key: string
) => {
  // Init. session - Receive shared wallet ID
  let deposit_msg1 = {
      auth: "authstr",
      proof_key: String(proof_key)
  }
  let shared_key_id = await http_client.post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);
  typeforce(typeforce.String, shared_key_id)

  // 2P-ECDSA with state entity to create a Shared key
  let statecoin = await keyGen(http_client, wasm_client, shared_key_id, secret_key, PROTOCOL.DEPOSIT);

  // Co-owned key address to send funds to (P_addr)
  let p_addr = await statecoin.getBtcAddress(wasm_client);

  return [shared_key_id, statecoin, p_addr]
}

// After funds are sent to p_addr sign backup tx and verify SMT.
// Return statecoin with smt_proot, state_chain_id, tx_backup_signed, p_addr.
export const depositConfirm = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  chaintip_height: number,
  backup_receive_addr: string
) => {
  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);

  // Calculate initial locktime
  let init_locktime = (chaintip_height) + (fee_info.initlock);

  // Build unsigned backup tx
  let txb_backup_unsigned = txBackupBuild(network, statecoin.funding_txid, backup_receive_addr, statecoin.value, init_locktime);
  let tx_backup_unsigned = txb_backup_unsigned.buildIncomplete();

  //co sign funding tx input signatureHash
  let signatureHash = tx_backup_unsigned.hashForSignature(0, tx_backup_unsigned.ins[0].script, Transaction.SIGHASH_ALL);
  let signature = await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, signatureHash.toString('hex'), PROTOCOL.DEPOSIT);
  // set witness data with signature
  let tx_backup_signed = tx_backup_unsigned;
  tx_backup_signed.ins[0].witness = [Buffer.from(signature)];

  // Wait for server confirmation of funding tx and receive new StateChain's id
  let deposit_msg2 = {
      shared_key_id: statecoin.shared_key_id,
  }
  let state_chain_id = await http_client.post(POST_ROUTE.DEPOSIT_CONFIRM, deposit_msg2);
  typeforce(typeforce.String, statecoin.shared_key_id)

  // Verify proof key inclusion in SE sparse merkle tree
  let root = await getRoot(http_client);
  let proof = await getSmtProof(http_client, root, statecoin.funding_txid);
  if (!verifySmtProof(wasm_client, root, statecoin.proof_key, proof)) throw "SMT verification failed."

  // Add proof and state chain id to Shared key
  statecoin.smt_proof = proof;
  statecoin.state_chain_id = state_chain_id;
  statecoin.tx_backup = tx_backup_signed;

  return statecoin
}
