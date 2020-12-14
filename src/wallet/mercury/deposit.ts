// Mercury deposit protocol.

import { keyGen, PROTOCOL, sign } from "./ecdsa";
import { POST_ROUTE, post } from "../request";
import { txBackupBuild, getRoot, verifySmtProof, getSmtProof, StateCoin } from "../";
import { Network, Transaction } from 'bitcoinjs-lib';

let typeforce = require('typeforce');

// Deposit Init. Generate shared key with stateChain Entity.
// Return Shared_key_id, statecoin and address to send funds to.
export const depositInit = async (proof_key: string, secret_key: string) => {
  // Init. session - Receive shared wallet ID
  let deposit_msg1 = {
      auth: "authstr",
      proof_key: String(proof_key)
  }
  let shared_key_id = await post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);
  typeforce(typeforce.String, shared_key_id)

  // 2P-ECDSA with state entity to create a Shared key
  let statecoin = await keyGen(shared_key_id, secret_key, proof_key, PROTOCOL.DEPOSIT);

  // Co-owned key address to send funds to (P_addr)
  let p_addr = await statecoin.getBtcAddress();

  return [shared_key_id, statecoin, p_addr]
}

// After funds are sent to p_addr sign backup tx and verify SMT.
// Return smt_proot, state_chain_id, tx_backup_signed, p_addr.
export const depositConfirm = async (
  chaintip_height: number,
  fee_info: any,
  backup_receive_addr: string,
  network: Network,
  statecoin: StateCoin
) => {
  // Calculate initial locktime
  let init_locktime = (chaintip_height) + (fee_info.initlock);

  // Build unsigned backup tx
  let txb_backup_unsigned = txBackupBuild(network, statecoin.funding_txid, backup_receive_addr, statecoin.value, init_locktime);

  let tx_backup_unsigned = txb_backup_unsigned.buildIncomplete();

  //co sign funding tx input signatureHash
  let signatureHash = tx_backup_unsigned.hashForSignature(0, tx_backup_unsigned.ins[0].script, Transaction.SIGHASH_ALL);
  let signature = await sign(statecoin.shared_key_id, statecoin.shared_key, signatureHash.toString('hex'), PROTOCOL.DEPOSIT);
  // set witness data with signature
  let tx_backup_signed = tx_backup_unsigned;
  tx_backup_signed.ins[0].witness = [Buffer.from(signature)];

  // Wait for server confirmation of funding tx and receive new StateChain's id
  let deposit_msg2 = {
      shared_key_id: statecoin.shared_key_id,
  }
  let state_chain_id = await post(POST_ROUTE.DEPOSIT_CONFIRM, deposit_msg2);
  typeforce(typeforce.String, statecoin.shared_key_id)

  // Verify proof key inclusion in SE sparse merkle tree
  let root = await getRoot();
  let proof = await getSmtProof(root, statecoin.funding_txid);
  if (!verifySmtProof(root, statecoin.proof_key, proof)) throw "SMT verification failed."

  // Add proof and state chain id to Shared key
  statecoin.smt_proof = proof;
  statecoin.state_chain_id = state_chain_id;
  statecoin.tx_backup = tx_backup_signed;

  return statecoin
}
