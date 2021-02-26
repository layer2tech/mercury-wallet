// Conductor Swap protocols

import { HttpClient, MockHttpClient, StateCoin, POST_ROUTE, GET_ROUTE } from '..';
import { pollUtxo, pollSwap, swapInfo } from "./info_api";
import { getStateChain } from "../mercury/info_api";
import { encodeSecp256k1Point, StateChainSig, proofKeyToSCEAddress, pubKeyToScriptPubKey, encryptECIES, decryptECIES, getSigHash, decryptECIESx1, encryptECIESt2 } from "../util";
import { BIP32Interface, Network, TransactionBuilder, crypto, script, Transaction } from 'bitcoinjs-lib';
import { v4 as uuidv4 } from 'uuid';

let bitcoin = require("bitcoinjs-lib");

let types = require("../types")
let typeforce = require('typeforce');

export const pingServer = async (
  http_client: HttpClient | MockHttpClient,
) => {
  return await http_client.get(GET_ROUTE.PING, {})
}

//conductor::register_utxo,
//conductor::swap_first_message,
//conductor::swap_second_message,  



/// Blind Spend Token data for each Swap. (priv, pub) keypair, k and R' value for signing and verification.
export class BSTRequestorData {
  u: string; 
  v: string; 
  r: Secp256k1Point; 
  e_prime: string;
  m: string;

  constructor(u: string, v: string, r: Secp256k1Point, e_prime: string, m: string){

  }

}

/// Struct serialized to string to be used as Blind sign token message
export class BlindedSpentTokenMessage {
    swap_id: string;
    nonce: string;

    constructor(swap_id: string){
      this.swap_id = swap_id;
      this.nonce = uuidv4();
    }
}

/// Struct defines a Swap. This is signed by each participant as agreement to take part in the swap.
export class SwapToken {
  id: string; //Uuid,
  amount: number; 
  time_out: number;
  statechain_ids: string[]; //Vec<Uuid>,


  constructor(id: string, amount: number, time_out: number, statechain_ids: string[]) {
    this.id = id;
    this.amount = amount;
    this.time_out = time_out;
    this.statechain_ids = statechain_ids;
  }

  /// Create message to be signed
  to_message() : Buffer {
    let buf = Buffer.from(String(this.amount) + String(this.time_out) + String(this.statechain_ids), "utf8");
    return crypto.sha256(buf) 
  }

  /// Generate Signature for change of state chain ownership
  sign(proof_key_der: BIP32Interface): String {
    let hash = this.to_message();
    let sig = proof_key_der.sign(hash, false);

     // Encode into bip66 and remove hashType marker at the end to match Server's bitcoin::Secp256k1::Signature construction.
     let encoded_sig = script.signature.encode(sig,1);
     encoded_sig = encoded_sig.slice(0, encoded_sig.length-1);
     let sig_str = encoded_sig.toString("hex");

     return sig_str
  }

  // Verify self's signature for transfer or withdraw
  verify_sig(proof_key_der: BIP32Interface, sig: string): boolean {
    let proof = Buffer.from(sig, "hex");
    // Re-insert hashType marker ("01" suffix) and decode from bip66
    proof = Buffer.concat([proof, Buffer.from("01", "hex")]);
    let decoded = script.signature.decode(proof);

    let hash = this.to_message();
    return proof_key_der.verify(hash, decoded.signature);
  }

}

/// Blind Spend Token data for each Swap. (priv, pub) keypair, k and R' value for signing and verification.
export interface BSTSenderData{
  x: string,  
  q: Secp256k1Point,
  k: string,
  r_prime: Secp256k1Point,
}

export interface SwapInfo {
  status: string, //SwapStatus,
  swap_token: SwapToken,
  bst_sender_data: BSTSenderData,
}

// StateChain Entity API
export interface StateChainDataAPI{
  utxo: any,
  amount: number,
  chain: any[],
  locktime: number,
}

export const swapFirstMessage = async (
  http_client: HttpClient | MockHttpClient,
  swap_info: SwapInfo,
  statechain_id: string,
  transfer_batch_sig: StateChainSig,
  new_address: SCEAddress,
): Promise<BSTRequestorData> => {

  let swap_token = swap_info.swap_token;

  let statechain_data: StateChainDataAPI = getStateChain(http_client, statechain_id);

  let proof_pub_key = statechain_data.chain[statechain_data.chain.length-1].data;

  let proof_key_der = bitcoin.ECPair.fromPublicKey(Buffer.from(proof_pub_key, "hex"));

  let proof_key_priv = proof_key_der.private_key.key;

  let swap_token_sig = swap_token.sign(proof_key_der);
  
  let blindedspenttokenmessage = new BlindedSpentTokenMessage(swap_token.id);

  //Requester
  let m = JSON.stringify(blindedspenttokenmessage);
  
  // Requester setup BST generation
  let my_bst_data = BSTRequestorData::setup(swap_info.bst_sender_data.get_r_prime(), &m)?;

  let requestor_data =  await http_client.post(POST_ROUTE.SWAP_FIRST, swapMsg1);
  typeforce(types.BSTRequestorData, requestor_data);
  return requestor_data;
}

// curv::elliptic::curves::secp256_k1::Secp256k1Point
export interface Secp256k1Point{
  x: string,
  y: string
}

/// (s,r) blind spend token
export interface BlindedSpendToken{
  s: string,
  r: Secp256k1Point,
  m: string,
}

/// Owner -> Conductor
export interface SwapMsg2{
  swap_id: string, //Uuid,
  blinded_spend_token: BlindedSpendToken,
}

export const swapSecondMessage = async (
  http_client: HttpClient | MockHttpClient,
  swapMsg2: SwapMsg2,
) => {
  return await http_client.post(POST_ROUTE.SWAP_SECOND, swapMsg2)
}
  
export interface SwapMsg1 {
  swap_id: string, //Uuid,
  statechain_id: string, //Uuid,
  swap_token_sig: Object, //Signature,
  transfer_batch_sig: StateChainSig,
  address: SCEAddress,
  bst_e_prime: string,
}

export interface PrepareSignTxMsg {
  shared_key_id: string,
  protocol: string,
  tx_hex: string,
  input_addrs: string[],
  input_amounts: number[],
  proof_key: string,
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

export interface SCEAddress {
  tx_backup_addr: string,
  proof_key: string
}