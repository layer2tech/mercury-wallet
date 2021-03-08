// Conductor Swap protocols

import { HttpClient, MockHttpClient, StateCoin, POST_ROUTE, GET_ROUTE, Wallet } from '..';
import {transferSender, transferReceiver, TransferFinalizeData, transferReceiverFinalize, SCEAddress} from "../mercury/transfer"
import { pollUtxo, pollSwap, getSwapInfo } from "./info_api";
import { getStateChain } from "../mercury/info_api";
import { encodeSecp256k1Point, StateChainSig, proofKeyToSCEAddress, 
  pubKeyToScriptPubKey, encryptECIES, decryptECIES, getSigHash, decryptECIESx1, 
  encryptECIESt2} from "../util";
import { BIP32Interface, Network, TransactionBuilder, crypto, script, Transaction } from 'bitcoinjs-lib';
import { v4 as uuidv4 } from 'uuid';
import { SwapMsg1, BSTMsg, SwapMsg2, RegisterUtxo, SwapStatus, BatchData} from '../types';
import { AssertionError } from 'assert';
import { create } from 'domain';
import Swap from '../../containers/Swap/Swap';

let bitcoin = require("bitcoinjs-lib");

let types = require("../types")
let typeforce = require('typeforce');

export const pingServer = async (
  http_client: HttpClient | MockHttpClient,
) => {
  return await http_client.get(GET_ROUTE.PING, {})
}

function delay(s: number) {
  return new Promise( resolve => setTimeout(resolve, s) );
}

export const doSwap = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  swap_size: number,
  new_proof_key_der: BIP32Interface,
): Promise<StateCoin> => {

  console.log('swap.ts: doSwap - swap_register_utxo: ', statecoin.statechain_id);
  console.log('create public key:');
  console.log('create public key: ', proof_key_der.publicKey);
  console.log('create public key for :', proof_key_der.publicKey);
  let publicKey = proof_key_der.publicKey.toString('hex');
  console.log('create statechain sig for ', publicKey);
  let sc_sig = StateChainSig.create(proof_key_der, "SWAP", publicKey);

  console.log('create RegisterUtxo');
  let registerUtxo = new RegisterUtxo(
    statecoin.statechain_id,
    sc_sig,
    swap_size
  );

  console.log('swap_register_utxo: await swap_register_utxo - ep:', POST_ROUTE.SWAP_REGISTER_UTXO, ', ID:', registerUtxo);
  await http_client.post(POST_ROUTE.SWAP_REGISTER_UTXO, registerUtxo);

  console.log('await poll utxo');
  let swap_id = null
  while (swap_id === null){
    swap_id = await pollUtxo(http_client,statecoin.statechain_id);
    await delay(3);
  };
  typeforce(types.SwapID, swap_id);

  console.log('await swap info');
  let swap_info = null;
  while (swap_info === null){
    swap_info = await getSwapInfo(http_client,swap_id);
    await delay(3);
  };
  typeforce(types.SwapInfo, swap_info);

  let address = new types.SCEAddress (
    null,
    new_proof_key_der.publicKey,
  );

  console.log('await new transfer batch sig');
  let transfer_batch_sig = await StateChainSig.new_transfer_batch_sig(proof_key_der,swap_id,statecoin.statechain_id);

  console.log('await first message');
  let my_bst_data = await first_message(http_client, 
    wasm_client,swap_info,statecoin.statechain_id,transfer_batch_sig,
    address,new_proof_key_der);
  typeforce(types.BSTRequestorData, my_bst_data);  


  console.log('await poll swap');
  while(true){
    let phase = await pollSwap(http_client, swap_id);
    if (phase === SwapStatus.Phase2){
      break;
    }
    await delay(3)
  }

  let publicProofKey = new_proof_key_der.publicKey;

  console.log('await get blinded spend signature');
  let bss = await get_blinded_spend_signature(http_client, wasm_client, swap_id,statecoin.statechain_id);
  typeforce(types.BlindedSpendSignature, bss);    

  console.log('await second message');
  let receiver_addr = await second_message(http_client, wasm_client, swap_id, my_bst_data, bss);

  console.log('await poll swap');
  while(true){
    let phase = await pollSwap(http_client, swap_id);
    if (phase === SwapStatus.Phase4){
      break;
    }
    await delay(3)
  }

  console.log('transferSender');
  let _ = transferSender(http_client, wasm_client, network, statecoin, proof_key_der, receiver_addr.proof_key);
 
  let commitment = wasm_client.Commitment.make_commitment(statecoin.statechain_id);

  let batch_id = swap_id;

  console.log('await do_transfer_receiver');
  let transfer_finalized_data = await do_transfer_receiver(
    http_client,
    wasm_client,
    batch_id,
    commitment.commitment,
    swap_info.swap_token.statechain_ids,
    address,
    new_proof_key_der
  );

  console.log('await pollSwap');
  while(true){
    let phase = await pollSwap(http_client, swap_id);
    if (phase === SwapStatus.End){
      break;
    }
    await delay(3)
  }

  //Confirm batch transfer status and finalize the transfer in the wallet
  console.log('await info transfer batch');
  let bt_info = await http_client.post(POST_ROUTE.INFO_TRANSFER_BATCH, batch_id);
  typeforce(types.TransferBatchDataAPI, bt_info);


  if (!bt_info.finalized) {
    throw new Error("Swap error: batch transfer not finalized");
  }

  console.log('await transfer receiver finalize');
  let statecoin_out = await transferReceiverFinalize(http_client, wasm_client, transfer_finalized_data);

  return statecoin_out;

}

export const do_transfer_receiver = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  batch_id: string,
  commit: string,
  statechain_ids: Array<String>,
  rec_se_addr: SCEAddress,
  rec_se_addr_bip32: BIP32Interface,
): Promise<TransferFinalizeData> => {
  for (var id of statechain_ids){
    while(true) {
      let msg3 = await http_client.post(POST_ROUTE.TRANSFER_GET_MSG, id);
      try{
        typeforce(types.TransferMsg3, msg3);  
      }catch(err){
        continue;
      }
      if (msg3.rec_se_addr.proof_key == rec_se_addr.proof_key){
        let batch_data = new BatchData(batch_id,commit);
        let tfd =  await transferReceiver(http_client, msg3,rec_se_addr_bip32,batch_data);
        return tfd;
      }
    }
  }
  throw new Error('no swap transfer message addressed to me');
}

export const swap_register_utxo = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  statechain_id: string,
  swap_size: number,
  proof_key_der: BIP32Interface,
) => {
  //console.log('await getStateChain: {}', statechain_id);
  //let statechain_data = await getStateChain(http_client, statechain_id);
  //typeforce(types.StateChainDataAPI, statechain_data);
  //let chain = statechain_data.chain;

  //purpose, data, ""
  console.log('create public key for ', proof_key_der.publicKey);
  let publicKey = proof_key_der.publicKey.toString('hex');
  console.log('create statechain sig for ', publicKey);
  let sc_sig = StateChainSig.create(proof_key_der, "SWAP", publicKey);

  console.log('create RegisterUtxo');
  let registerUtxo = new RegisterUtxo(
    statechain_id,
    sc_sig,
    swap_size
  );

  console.log('swap_register_utxo: await swap_register_utxo');
  await http_client.post(POST_ROUTE.SWAP_REGISTER_UTXO, registerUtxo);
};


//conductor::register_utxo,
//conductor::swap_first_message,
//conductor::swap_second_message,  

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

export interface Commitment {
  commitment: String,
  nonce: Buffer,
}

export interface BSTSenderData {
  x: Secp256k1Point,
  q: Secp256k1Point,
  k: Secp256k1Point,
  r_prime: Secp256k1Point,
}


export interface BSTRequestorData {
  u: Secp256k1Point,
  r: Secp256k1Point,
  v: Secp256k1Point,
  e_prime: Secp256k1Point,
  m: String,
}


export interface SwapInfo {
  status: SwapStatus,
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

export const first_message = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  swap_info: SwapInfo,
  statechain_id: string,
  transfer_batch_sig: StateChainSig,
  new_address: SCEAddress,
  proof_key_der: BIP32Interface,
): Promise<BSTRequestorData> => {

  let swap_token = swap_info.swap_token;

  let statechain_data = await getStateChain(http_client, statechain_id);
  typeforce(types.StateChainDataAPI, statechain_data);

  let proof_pub_key = statechain_data.chain[statechain_data.chain.length-1].data;

  let proof_key_der_pub = bitcoin.ECPair.fromPublicKey(Buffer.from(proof_pub_key, "hex"));

  if (!(proof_key_der.publicKey === proof_key_der_pub.key.public)){
    throw new Error('statechain_data proof_pub_key does not derive from proof_key_priv');
  }

  let swap_token_sig = swap_token.sign(proof_key_der);
  
  let blindedspenttokenmessage = new BlindedSpentTokenMessage(swap_token.id);

  //Requester
  let m = JSON.stringify(blindedspenttokenmessage);
  
  // Requester setup BST generation
  let my_bst_data = wasm_client.BSTRequestorData.setup(wasm_client, swap_info.bst_sender_data.r_prime, m);

  let swapMsg1 = new SwapMsg1(
    swap_token.id,
    statechain_id,
    swap_token_sig,
    transfer_batch_sig,
    new_address,
    my_bst_data.e_prime,
  )

  let requestor_data =  await http_client.post(POST_ROUTE.SWAP_FIRST, swapMsg1);
  typeforce(types.BSTRequestorData, requestor_data);
  return requestor_data;
}

/// blind spend signature
export interface BlindedSpendSignature{
  s_prime: Secp256k1Point,
}

export const get_blinded_spend_signature = async(
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  swap_id: String,
  statechain_id: String,
): Promise<BlindedSpendSignature> => {
  let bstMsg = new BSTMsg(swap_id, statechain_id);
  let result =  await http_client.post(POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE, bstMsg);
  typeforce(types.BlindedSpendSignature, result);
  return result;
}

export const second_message = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  swap_id: String,
  my_bst_data: BSTRequestorData,
  blinded_spend_signature: BlindedSpendSignature,
): Promise<SCEAddress> => {
  let bst = wasm_client.BSTRequestorData.make_blind_spend_token(my_bst_data,blinded_spend_signature);
  let swapMsg2 = new SwapMsg2(swap_id, bst);
  let result =  await http_client.post(POST_ROUTE.SWAP_SECOND, swapMsg2);
  typeforce(types.BlindedSpendSignature, result);
  return result;
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
export interface BatchData {
  commitment: String,
  nonce: Buffer,
}

export interface SwapStatus {
  Phase1: "Phase1",
  Phase2: "Phase2",
  Phase3: "Phase3",
  Phase4: "Phase4",
  End: "End",
}