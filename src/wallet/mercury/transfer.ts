// Mercury transfer protocol. Transfer statecoins to new owner.

import { BIP32Interface, Network, Transaction, script } from "bitcoinjs-lib";
import { ElectrumClient, MockElectrumClient, HttpClient, MockHttpClient, POST_ROUTE, StateCoin, verifySmtProof, pubKeyTobtcAddr } from "..";
import { FEE } from "../util";
import { FeeInfo, getFeeInfo, getRoot, getSmtProof, getStateChain, StateChainDataAPI } from "./info_api";
import { keyGen, PROTOCOL, sign } from "./ecdsa";
import { encodeSecp256k1Point, StateChainSig, proofKeyToSCEAddress, pubKeyToScriptPubKey, encryptECIES, decryptECIES, getSigHash } from "../util";

let bitcoin = require("bitcoinjs-lib");
let cloneDeep = require('lodash.clonedeep');
let types = require("../types")
let typeforce = require('typeforce');
let BN = require('bn.js');

let EC = require('elliptic').ec
let secp256k1 = new EC('secp256k1')
const n = secp256k1.curve.n

// transfer() messages:
// 0. Receiver communicates address to Sender (B2 and C2)
// 1. Sender Initialises transfer protocol with State Entity
//      a. init, authorisation, provide receivers proofkey C2
//      b. State Entity generates x1 and sends to Sender
//      c. Sender and State Entity Co-sign new back up transaction sending to Receivers
//          backup address Addr(B2)
// 2. Receiver performs transfer with State Entity
//      a. Verify state chain is updated
//      b. calculate t1=01x1
//      c. calucaulte t2 = t1*o2_inv
//      d. Send t2, O2 to state entity
//      e. Verify o2*S2 = P


export const transferSender = async (
  http_client: HttpClient |  MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  receiver_addr: string
): Promise<TransferMsg3> => {
  // Checks for spent, owned etc here
  let new_tx_backup;
  if (statecoin.tx_backup) {
    new_tx_backup = cloneDeep(statecoin.tx_backup);
  } else {
    throw Error("Back up tx does not exist. Statecoin deposit is not complete.")
  }

  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);

  // Get statechain from SE and check ownership
  let statechain_data = await getStateChain(http_client, statecoin.statechain_id);
  if (statechain_data.amount === 0) throw Error("StateChain " + statecoin.statechain_id + " already withdrawn.");
  let sc_statecoin = statechain_data.chain.pop();
  if (sc_statecoin.data !== statecoin.proof_key) throw Error("StateChain not owned by this Wallet. Incorrect proof key: chain has " + sc_statecoin.data + ", expected " + statecoin.proof_key);

  // Sign statecoin to signal desire to Transfer
  let statechain_sig = StateChainSig.create(proof_key_der, "TRANSFER", receiver_addr);
  // Init transfer: Send statechain signature or batch data
  let transfer_msg1 = {
      shared_key_id: statecoin.shared_key_id,
      statechain_sig: statechain_sig
  }
  let transfer_msg2 = await http_client.post(POST_ROUTE.TRANSFER_SENDER, transfer_msg1);
  typeforce(types.TransferMsg2, transfer_msg2);

  // wallet.decrypt(&mut transfer_msg2)?;

  // Edit backup tx with new owners proof-key address and sign
  new_tx_backup.outs[0].script = pubKeyToScriptPubKey(receiver_addr, network);
  new_tx_backup.locktime = statechain_data.locktime - fee_info.interval;

  let pk = statecoin.getSharedPubKey();
  let signatureHash = getSigHash(new_tx_backup, 0, pk, statecoin.value, network);

  // ** Can remove PrepareSignTxMsg and replace with backuptx throughout client and server?
  // Create PrepareSignTxMsg to send funding tx data to receiver
  let prepare_sign_msg: PrepareSignTxMsg = {
    shared_key_ids: [statecoin.shared_key_id],
    protocol: PROTOCOL.TRANSFER,
    tx_hex: new_tx_backup.toHex(),
    input_addrs: [pk],
    input_amounts: [statecoin.value],
    proof_key: statecoin.proof_key,
  };

  // Sign new back up tx
  let signature: string[] = await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, prepare_sign_msg, signatureHash, PROTOCOL.TRANSFER);

  // Set witness data as signature
  let new_tx_backup_signed = new_tx_backup;
  new_tx_backup_signed.ins[0].witness = [Buffer.from(signature[0]),Buffer.from(signature[1])];
  prepare_sign_msg.tx_hex = new_tx_backup_signed.toHex();

  // Get o1 priv key
  let o1 = statecoin.shared_key.private.x2;

  // Get SE's x1
  let x1 = transfer_msg2.x1.secret_bytes;
  let x1_dec = decryptECIES(proof_key_der.privateKey!.toString("hex"), Buffer.from(x1).toString("hex"));

  let o1_bn = new BN(o1, 16);
  let x1_bn = new BN(x1_dec, 16);

  // t1 = o1x1
  let t1 = o1_bn.mul(x1_bn).umod(n);

  let t1_enc = {
    secret_bytes: Array.from(encryptECIES(receiver_addr,t1.toString("hex")))
  }

  let transfer_msg3 = {
    shared_key_id: statecoin.shared_key_id,
    t1: t1_enc,
    statechain_sig: statechain_sig,
    statechain_id: statecoin.statechain_id,
    tx_backup_psm: prepare_sign_msg,
    rec_se_addr: proofKeyToSCEAddress(receiver_addr, network),
  };
  typeforce(types.TransferMsg3, transfer_msg3);

  // Update server database with transfer message 3 so that
  // the receiver can get the message
  await http_client.post(POST_ROUTE.TRANSFER_UPDATE_MSG, transfer_msg3);

  return transfer_msg3
}

export const transferReceiver = async (
  http_client: HttpClient |  MockHttpClient,
  electrum_client: ElectrumClient |  MockElectrumClient, 
  network: Network,
  transfer_msg3: any,
  se_rec_addr_bip32: BIP32Interface,
  batch_data: any,
  req_confirmations: number
): Promise<TransferFinalizeData> => {
  // Get statechain data (will Err if statechain not yet finalized)
  let statechain_data = await getStateChain(http_client, transfer_msg3.statechain_id);

  // Verify state chain represents this address as new owner
  let prev_owner_proof_key = statechain_data.chain[statechain_data.chain.length-1].data;
  let prev_owner_proof_key_der = bitcoin.ECPair.fromPublicKey(Buffer.from(prev_owner_proof_key, "hex"));
  let statechain_sig = new StateChainSig(transfer_msg3.statechain_sig.purpose, transfer_msg3.statechain_sig.data, transfer_msg3.statechain_sig.sig);
  if (!statechain_sig.verify(prev_owner_proof_key_der)) throw new Error("Invalid StateChainSig.");

  // Backup tx verification

  // 1. Verify backup transaction amount
  let tx_backup = Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);
  if ((tx_backup.outs[0].value + tx_backup.outs[1].value + FEE) != statechain_data.amount) throw new Error("Backup tx invalid amount.");
  // 2. Verify the input matches the specified outpoint
  if (tx_backup.ins[0].hash.reverse().toString("hex") != statechain_data.utxo.txid) throw new Error("Backup tx invalid input.");
  if (tx_backup.ins[0].index != statechain_data.utxo.vout) throw new Error("Backup tx invalid input.");
  // 3. Verify the input signature is valid
  tx_backup.ins[0].hash = tx_backup.ins[0].hash.reverse();
  let pk = tx_backup.ins[0].witness[1].toString("hex");
  let sighash = getSigHash(tx_backup, 0, pk, statechain_data.amount, network);
  let sighash_bytes = Buffer.from(sighash, "hex");
  let sig = tx_backup.ins[0].witness[0];
  let pk_der = bitcoin.ECPair.fromPublicKey(Buffer.from(pk, "hex"));
  let decoded = script.signature.decode(sig);
  if (!pk_der.verify(sighash_bytes, decoded.signature)) throw new Error("Backup tx invalid signature.");
  // 4. Ensure backup tx funds are sent to address owned by this wallet
  if (se_rec_addr_bip32 === undefined) throw new Error("Cannot find backup receive address. Transfer not made to this wallet.");
  if (se_rec_addr_bip32.publicKey.toString("hex") !== transfer_msg3.rec_se_addr.proof_key) throw new Error("Backup tx not sent to addr derived from receivers proof key. Transfer not made to this wallet.");

  // 5. Check coin unspent and correct value
  let addr = pubKeyTobtcAddr(pk, network);
  let out_script = bitcoin.address.toOutputScript(addr, network);
  let match = false;
  let funding_tx_data = await electrum_client.getScriptHashListUnspent(out_script);
  if (funding_tx_data===null)  throw new Error("Unspent UTXO not found.");
   if (funding_tx_data.length === 0) throw new Error("Unspent UTXO not found.");
   for (let i=0; i<funding_tx_data.length; i++) {
     if (funding_tx_data[i].tx_hash === tx_backup.ins[0].hash.reverse().toString("hex") && funding_tx_data[i].tx_pos === tx_backup.ins[0].index) {
       if (funding_tx_data[i].value === (tx_backup.outs[0].value + tx_backup.outs[1].value + FEE)) {
         match = true;
         break;
       }
     }
   }
  if (!match) throw new Error("Backup tx input incorrect or spent.");
  // 6. Check coin has the required confirmations
  let tx_data = await electrum_client.getTransaction(statechain_data.utxo.txid);
  if (tx_data===null)  throw new Error("TxID not found.");
  if (tx_data.confirmations < req_confirmations) throw new Error("Coin has insufficient confirmations.");

  // decrypt t1
  let t1 = decryptECIES(se_rec_addr_bip32.privateKey!.toString("hex"), transfer_msg3.t1.secret_bytes)

  // calculate t2
  let t1_bn = new BN(t1, 16);

  // get o2 private key and corresponding 02 public key
  let o2_keypair = se_rec_addr_bip32;
  let o2 = o2_keypair.privateKey!.toString("hex");

  let o2_bn = new BN(o2, 16);
  let o2_inv_bn = o2_bn.invm(n);

  // t2 = t1*o2_inv = o1*x1*o2_inv
  let t2 = t1_bn.mul(o2_inv_bn).mod(n);

  // get SE pub hey share for t2 encryption
  let user_id = { id: transfer_msg3.shared_key_id};
  let s1_pubkey = await http_client.post(POST_ROUTE.TRANSFER_PUBKEY, user_id);

  // encrypt t2
  let t2_enc = {
    secret_bytes: Array.from(encryptECIES(s1_pubkey.key,t2.toString("hex")))
  }

  let transfer_msg4 = {
    shared_key_id: transfer_msg3.shared_key_id,
    statechain_id: transfer_msg3.statechain_id,
    t2: t2_enc,
    statechain_sig: transfer_msg3.statechain_sig,
    o2_pub: encodeSecp256k1Point(o2_keypair.publicKey.toString("hex")),        // decode into {x,y}
    tx_backup_hex: transfer_msg3.tx_backup_psm.tx_hex,
    batch_data,
  };
  typeforce(types.TransferMsg4, transfer_msg4);
  let transfer_msg5: TransferMsg5 = await http_client.post(POST_ROUTE.TRANSFER_RECEIVER, transfer_msg4);
  typeforce(types.TransferMsg5, transfer_msg5);

  // Update tx_backup_psm shared_key_id with new one
  let tx_backup_psm = transfer_msg3.tx_backup_psm;
  tx_backup_psm.shared_key_id = transfer_msg5.new_shared_key_id;

  // Data to update wallet with transfer. Should only be applied after StateEntity has finalized.
  let finalize_data = {
      new_shared_key_id: transfer_msg5.new_shared_key_id,
      o2: o2,
      s2_pub: transfer_msg5.s2_pub,
      state_chain_data: statechain_data,
      proof_key: transfer_msg3.rec_se_addr.proof_key,
      statechain_id: transfer_msg3.statechain_id,
      tx_backup_psm: tx_backup_psm,
  };
  typeforce(types.TransferFinalizeData, finalize_data);

  return finalize_data
}

export const transferReceiverFinalize = async (
  http_client: HttpClient |  MockHttpClient,
  wasm_client: any,
  finalize_data: TransferFinalizeData,
): Promise<StateCoin> => {
  // Make shared key with new private share
  // 2P-ECDSA with state entity to create a Shared key
  let statecoin = await keyGen(http_client, wasm_client, finalize_data.new_shared_key_id, finalize_data.o2, PROTOCOL.TRANSFER);
  statecoin.funding_txid = finalize_data.state_chain_data.utxo.txid;
  statecoin.funding_vout = finalize_data.state_chain_data.utxo.vout;

  // Check shared key master public key === private share * SE public share
  // let P = BigInt("0x" + finalize_data.s2_pub) * BigInt("0x" + finalize_data.o2) * BigInt("0x" + finalize_data.theta)
  // if (P
  //     != wallet
  //         .get_shared_key(&finalize_data.new_shared_key_id)?
  //         .share
  //         .public
  //         .q
  //         .get_element()

  // Verify proof key inclusion in SE sparse merkle tree
  let root = await getRoot(http_client);
  let proof = await getSmtProof(http_client, root, statecoin.funding_txid);
  if (!verifySmtProof(wasm_client, root, finalize_data.proof_key, proof)) throw Error("SMT verification failed.");

  // Add state chain id, value, proof key and SMT inclusion proofs to local SharedKey data
  // Add proof and state chain id to Shared key
  statecoin.statechain_id = finalize_data.statechain_id;
  statecoin.value = finalize_data.state_chain_data.amount;
  statecoin.smt_proof = proof;
  statecoin.tx_backup = Transaction.fromHex(finalize_data.tx_backup_psm.tx_hex);
  statecoin.proof_key = finalize_data.proof_key;
  statecoin.funding_vout = statecoin.tx_backup.ins[0].index;

  return statecoin
}


export const transferBatchSign = (
  http_client: HttpClient |  MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  batch_id: string,
  proof_key_der: BIP32Interface
): StateChainSig => {
  let tbs = StateChainSig.new_transfer_batch_sig(proof_key_der, batch_id, statecoin.statechain_id);
  return tbs;
}

export interface UserID {
  id: string,
}

export interface Secp256k1Point {
  x: string,
  y: string
}

export interface SCEAddress {
  tx_backup_addr: string | null,
  proof_key: string
}

export interface PrepareSignTxMsg {
    shared_key_ids: string[],
    protocol: string,
    tx_hex: string,
    input_addrs: string[], // keys being spent from
    input_amounts: number[],
    proof_key: string | null,
}

export interface TransferMsg3 {
  shared_key_id: string,
  statechain_id: string,
  t1: {secret_bytes: number[]},
  statechain_sig: StateChainSig,
  tx_backup_psm: PrepareSignTxMsg,
  rec_se_addr: SCEAddress,
}

export interface TransferMsg4 {
  shared_key_id: string,
  statechain_id: string,
  t2: {secret_bytes: number[]}, // t2 = t1*o2_inv = o1*x1*o2_inv
  statechain_sig: StateChainSig,
  o2_pub: string,
  tx_backup_hex: string,
  batch_data: any,
}

export interface TransferMsg5 {
  new_shared_key_id: string,
  s2_pub: any,
}

export interface  TransferFinalizeData {
    new_shared_key_id: string,
    o2: string,
    s2_pub: any,
    state_chain_data: any,
    proof_key: string,
    statechain_id: string,
    tx_backup_psm: PrepareSignTxMsg,
}
