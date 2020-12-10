// Mercury deposit protocol.

import { keyGen, PROTOCOL, sign } from "./ecdsa";
import { POST_ROUTE, post } from "../request";
import { Wallet, getFeeInfo, txBackupBuild, getRoot, verifySmtProof, getSmtProof } from "../";
import { Transaction } from 'bitcoinjs-lib';


// Deposit coins into state entity. Returns shared_key_id, state_chain_id, funding txid,
// signed backup tx, back up transacion data and proof_key
export const deposit = async (wallet: Wallet) => {
  // gen these from Wallet
  let secret_key = "12345";
  let message = "12345";
  let proof_key = "02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f";
  let value = 1000;

  // Get state entity fee info
  let fee_info = await getFeeInfo();

  // Init. session - Receive shared wallet ID
  let shared_key_id = await despoitInit(proof_key);
  // 2P-ECDSA with state entity to create a Shared key
  let statecoin = await keyGen(shared_key_id, secret_key, proof_key, value, PROTOCOL.DEPOSIT);

  // Co-owned key address to send funds to (P_addr)
  let p_addr = await statecoin.getBtcAddress();


  // Function will be split here to allow for user to send funds to p_addr, or to receive
  // funds for wallet to hadnle building of funding_tx.
  let funding_txid = "ae0093c55f0446e5cab54539cd65f3fc1a86932eebcad9c71a291e1c928530d0"


  // Calculate initial locktime
  let chaintip = wallet.electrum_client.get_tip_header();
  let init_locktime = (chaintip.height) + (fee_info.init_lock);

  // Build unsigned backup tx
  let backup_receive_addr = wallet.genBtcAddress();
  let txb_backup_unsigned = txBackupBuild(wallet.network, funding_txid, backup_receive_addr, value, init_locktime);

  let tx_backup_unsigned = txb_backup_unsigned.buildIncomplete();

  //co sign funding tx input signatureHash
  let signatureHash = tx_backup_unsigned.hashForSignature(0, tx_backup_unsigned.ins[0].script, Transaction.SIGHASH_ALL);
  let signature = await sign(shared_key_id, statecoin.shared_key, signatureHash.toString('hex'), PROTOCOL.DEPOSIT);
  // set witness data with signature
  let tx_backup_signed = tx_backup_unsigned;
  tx_backup_signed.ins[0].witness = [Buffer.from(signature)];

  // Wait for server confirmation of funding tx and receive new StateChain's id
  let state_chain_id = await despoitConfirm(shared_key_id);

  // Verify proof key inclusion in SE sparse merkle tree
  let root = await getRoot();
  let proof = await getSmtProof(root, funding_txid);
  if (!verifySmtProof(root, proof_key, proof)) throw "SMT verification failed."

  // Add proof and state chain id to Shared key
  statecoin.smt_proof = proof;
  statecoin.state_chain_id = state_chain_id;
  statecoin.tx_backup = tx_backup_signed;

  // Add to wallet
  wallet.statecoins.addCoin(statecoin);

  return [tx_backup_signed, p_addr]
}


const despoitInit = async (proof_key: string) => {
    let deposit_msg1 = {
        auth: "authstr",
        proof_key: String(proof_key)
    }
    let shared_key_id = await post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);

    return shared_key_id
}

const despoitConfirm = async (shared_key_id: string) => {
    let deposit_msg2 = {
        shared_key_id: shared_key_id,
    }
    let state_chain_id = await post(POST_ROUTE.DEPOSIT_CONFIRM, deposit_msg2);

    return state_chain_id
}
