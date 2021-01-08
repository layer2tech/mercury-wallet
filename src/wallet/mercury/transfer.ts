// Mercury transfer protocol. Transfer statecoins to new owner.

import { BIP32Interface, Network, Transaction } from "bitcoinjs-lib";
import { HttpClient, MockHttpClient, POST_ROUTE, StateCoin, verifySmtProof } from ".."
import { FeeInfo, getFeeInfo, getRoot, getSmtProof, getStateChain } from "./info_api";
import { keyGen, PROTOCOL, sign } from "./ecdsa";
import { TransferMsg4 } from "../types";
import { encodeSecp256k1Point, StateChainSig, proofKeyToSCEAddress, pubKeyToScriptPubKey } from "../util";

let bitcoin = require('bitcoinjs-lib')
let lodash = require('lodash');
let types = require("../types")
let typeforce = require('typeforce');
let bigintModArith = require('bigint-mod-arith')

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
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  receiver_addr: string
) => {
  // Checks for spent, owned etc here
  let new_tx_backup;
  if (statecoin.tx_backup) {
    new_tx_backup = lodash.cloneDeep(statecoin.tx_backup);
  } else {
    throw ("Back up tx does not exist. Statecoin deposit is not complete.")
  }

  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);

  // Get statechain from SE and check ownership
  let statechain_data = await getStateChain(http_client, statecoin.statechain_id);
  if (statechain_data.amoumt == 0) throw "StateChain " + statecoin.statechain_id + " already withdrawn."
  if (statechain_data.chain.pop().data != statecoin.proof_key) throw "StateChain not owned by this Statecoin. Incorrect proof key."

  // Sign statecoin to signal desire to Withdraw
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

  // Sign new back up tx
  let signatureHash = new_tx_backup.hashForSignature(0, new_tx_backup.ins[0].script, Transaction.SIGHASH_ALL);
  let signature = await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, signatureHash.toString('hex'), PROTOCOL.TRANSFER);
  // Set witness data as signature
  let new_tx_backup_signed = new_tx_backup;
  new_tx_backup_signed.ins[0].witness = [Buffer.from(signature)];

  // ** Can remove PrepareSignTxMsg and replace with backuptx throughout client and server?
  // Create PrepareSignTxMsg to send funding tx data to receiver
  let prepare_sign_msg: PrepareSignTxMsg = {
    shared_key_id: statecoin.shared_key_id,
    protocol: "TRANSFER",
    tx_hex: new_tx_backup_signed.toHex(),
    input_addrs: [],
    input_amounts: [],
    proof_key: statecoin.proof_key,
  };

  // Get o1 priv key
  let o1 = statecoin.shared_key.private.x2;
  let o1_bn = BigInt("0x" + o1);
  // Get SE's x1
  let x1 = transfer_msg2.x1.secret_bytes;
  let x1_bn = BigInt("0x" + Buffer.from(x1).toString("hex"))

  // t1 = o1x1
  let t1 = o1_bn * x1_bn;
  // let t1_encryptable = FESer::from_fe(&t1);

  let transfer_msg3 = {
    shared_key_id: statecoin.shared_key_id,
    t1: t1.toString(16),
    statechain_sig: statechain_sig,
    statechain_id: statecoin.statechain_id,
    tx_backup_psm: prepare_sign_msg,
    rec_se_addr: proofKeyToSCEAddress(receiver_addr, network),
  };
  typeforce(types.TransferMsg3, transfer_msg3);


  // //encrypt then make immutable
  // transfer_msg3.encrypt()?;
  // let transfer_msg3 = transfer_msg3;

  // Update server database with transfer message 3 so that
  // the receiver can get the message
  await http_client.post(POST_ROUTE.TRANSFER_UPDATE_MSG, transfer_msg3);

  return transfer_msg3
}

export const transferReceiver = async (
  http_client: HttpClient | MockHttpClient,
  transfer_msg3: TransferMsg3,
  se_rec_addr_bip32: any,
  _batch_data: any
) => {
  // Get statechain data (will Err if statechain not yet finalized)
  let statechain_data = await getStateChain(http_client, transfer_msg3.statechain_id);

  // Verify state chain represents this address as new owner
  let prev_owner_proof_key = statechain_data.chain[statechain_data.chain.length-1].data;
  let prev_owner_proof_key_der = bitcoin.ECPair.fromPublicKey(Buffer.from(prev_owner_proof_key, "hex"));
  let statechain_sig = new StateChainSig(transfer_msg3.statechain_sig.purpose, transfer_msg3.statechain_sig.data, transfer_msg3.statechain_sig.sig);
  if (!statechain_sig.verify(prev_owner_proof_key_der)) throw "Invalid StateChainSig."

  // decrypt transfer msg 3 and t1

  // calculate t2
  let t1 = transfer_msg3.t1;
  let t1_bn = BigInt("0x" + t1);

  // get o2 private key and corresponding 02 public key
  let o2_keypair = se_rec_addr_bip32;
  let o2 = o2_keypair.privateKey.toString("hex");

  let o2_bn = BigInt("0x" + o2);
  let o2_inv_bn = bigintModArith.modInv(o2_bn, BigInt(n));

  // t2 = t1*o2_inv = o1*x1*o2_inv
  let t2 = t1_bn * o2_inv_bn;

  let transfer_msg4 = {
    shared_key_id: transfer_msg3.shared_key_id,
    statechain_id: transfer_msg3.statechain_id,
    t2: t2.toString(),
    statechain_sig: transfer_msg3.statechain_sig,
    o2_pub: encodeSecp256k1Point(o2_keypair.publicKey.toString("hex")),        // decode into {x,y}
    tx_backup_hex: transfer_msg3.tx_backup_psm.tx_hex,
    batch_data: null,
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
      theta: transfer_msg5.theta,
      state_chain_data: statechain_data,
      proof_key: transfer_msg3.rec_se_addr,
      statechain_id: transfer_msg3.statechain_id,
      tx_backup_psm: tx_backup_psm,
  };
  typeforce(types.TransferFinalizeData, finalize_data);

  return finalize_data
}

export const transferReceiverFinalize = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  finalize_data: TransferFinalizeData,
) => {
  // Make shared key with new private share
  // 2P-ECDSA with state entity to create a Shared key
  let statecoin = await keyGen(http_client, wasm_client, finalize_data.new_shared_key_id, finalize_data.o2, PROTOCOL.TRANSFER);

  // Check shared key master public key == private share * SE public share
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
  if (!verifySmtProof(wasm_client, root, statecoin.proof_key, proof)) throw "SMT verification failed.";


  // Add state chain id, proof key and SMT inclusion proofs to local SharedKey data
  // Add proof and state chain id to Shared key
  statecoin.smt_proof = proof;
  statecoin.statechain_id = finalize_data.statechain_id;
  statecoin.tx_backup = Transaction.fromHex(finalize_data.tx_backup_psm.tx_hex);

  return statecoin
}

export interface Secp256k1Point {
  x: string,
  y: string
}

interface PrepareSignTxMsg {
    shared_key_id: string,
    protocol: string,
    tx_hex: string,
    input_addrs: string[], // keys being spent from
    input_amounts: number[],
    proof_key: string | null,
}


export interface TransferMsg3 {
  shared_key_id: string,
  statechain_id: string,
  t1: string,
  statechain_sig: StateChainSig,
  tx_backup_psm: PrepareSignTxMsg,
  rec_se_addr: string,
}

export interface TransferMsg4 {
  shared_key_id: string,
  statechain_id: string,
  t2: string, // t2 = t1*o2_inv = o1*x1*o2_inv
  statechain_sig: StateChainSig,
  o2_pub: string,
  tx_backup_hex: string,
  batch_data: any,
}

export interface TransferMsg5 {
  new_shared_key_id: string,
  s2_pub: any,
  theta: string,
}

export interface  TransferFinalizeData {
    new_shared_key_id: string,
    o2: string,
    s2_pub: any,
    theta: string,
    state_chain_data: Buffer,
    proof_key: string,
    statechain_id: string,
    tx_backup_psm: PrepareSignTxMsg,
}
