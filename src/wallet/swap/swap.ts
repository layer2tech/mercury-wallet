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
import { SwapMsg1, BSTMsg, SwapMsg2, RegisterUtxo, SwapStatus, BatchData, BSTRequestorData} from '../types';
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
  return new Promise( resolve => setTimeout(resolve, s*1000) );
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
  let swap_rounds=statecoin.swap_rounds;

  let publicKey = proof_key_der.publicKey.toString('hex');

  let sc_sig = StateChainSig.create(proof_key_der, "SWAP", publicKey);


  let registerUtxo = {
    statechain_id: statecoin.statechain_id,
    signature: sc_sig,
    swap_size: swap_size
  };

  let _reg_res = await http_client.post(POST_ROUTE.SWAP_REGISTER_UTXO, registerUtxo);


  let statechain_id = {
    id: statecoin.statechain_id
  }


  let swap_id = null
  while (true){
    swap_id = await pollUtxo(http_client,statechain_id);
    if (swap_id !== null) {
      typeforce(types.SwapID, swap_id);
      if (swap_id.id !== null) {
        break;
      }
    }
    await delay(3);
  };



  let swap_info = null;
  while (true){
    swap_info = await getSwapInfo(http_client,swap_id);
    if (swap_info !== null){

      break;
    }
    await delay(3);
  };

  typeforce(types.SwapInfo, swap_info);

  statecoin.swap_info=swap_info;

  let address = {
    "tx_backup_addr": null,
    "proof_key": new_proof_key_der.publicKey.toString("hex"),
  };
  typeforce(types.SCEAddress, address);


  let transfer_batch_sig = await StateChainSig.new_transfer_batch_sig(proof_key_der,swap_id.id,statecoin.statechain_id);
  let my_bst_data = await first_message(http_client,
    wasm_client,swap_info,statecoin.statechain_id,transfer_batch_sig,
    address,proof_key_der);

  while(true){
    let phase: string = await pollSwap(http_client, swap_id);
    if (statecoin.swap_info){
      statecoin.swap_info.status=phase;
    }
    if (phase !== SwapStatus.Phase1){
      break;
    }
    await delay(3)
  }


  let publicProofKey = new_proof_key_der.publicKey;

    let bss = await get_blinded_spend_signature(http_client, wasm_client, swap_id.id,statecoin.statechain_id);
  typeforce(types.BlindedSpendSignature, bss);

    let receiver_addr = await second_message(http_client, wasm_client, swap_id.id, my_bst_data, bss);

  while(true){
    let phase = await pollSwap(http_client, swap_id);
    if (statecoin.swap_info){
      statecoin.swap_info.status=phase;
    }
    if (phase === SwapStatus.Phase4){
      break;
    }
    if (phase === SwapStatus.End){
      throw new Error("Swap error: unexpended swap status \"End\"");
    }
    if (phase === SwapStatus.Phase1){
      throw new Error("Swap error: unexpended swap status \"Phase1\"");
    }
    await delay(3)
  }

  let _ = transferSender(http_client, wasm_client, network, statecoin, proof_key_der, receiver_addr.proof_key);

  let batch_data_json = wasm_client.Commitment.make_commitment(statecoin.statechain_id);
  let batch_data = JSON.parse(batch_data_json);
  typeforce(types.BatchData, batch_data);
  let commitment = batch_data.commitment;

  let batch_id = swap_id;

  let transfer_finalized_data = await do_transfer_receiver(
    http_client,
    wasm_client,
    batch_id.id,
    commitment,
    swap_info.swap_token.statechain_ids,
    address,
    new_proof_key_der
  );

  while(true){
    let phase = await pollSwap(http_client, swap_id);
    console.log("swap status: ", phase);
    if (statecoin.swap_info){
      statecoin.swap_info.status=phase;
    }
    if (phase === SwapStatus.End){
      break;
    }
    if (phase === null){
      break;
    }
    await delay(3)
  }

  let statecoin_out = await transferReceiverFinalize(http_client, wasm_client, transfer_finalized_data);

  statecoin_out.swap_rounds=swap_rounds+1;
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
    let msg3;
    while(true) {
      try{
        msg3 = await http_client.post(POST_ROUTE.TRANSFER_GET_MSG,{"id":id});
      }catch(err){
        console.log(err);
        await delay(3);
        continue;
      }
      typeforce(types.TransferMsg3, msg3);
      if (msg3.rec_se_addr.proof_key == rec_se_addr.proof_key){
        let batch_data = {
          "id":batch_id,
          "commitment":commit,
        }
        let finalize_data = await transferReceiver(http_client, msg3,rec_se_addr_bip32,batch_data);
        typeforce(types.TransferFinalizeData, finalize_data);
        return finalize_data;
      } else {
        break;
      }
    }
  }
  throw new Error('no swap transfer message addressed to me');
}

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
  // to_message(wasm_client: any) : Buffer {
  to_message() : Buffer {
        
    let buf = Buffer.from(this.amount +""+ this.time_out + JSON.stringify(this.statechain_ids), "utf8")
    let hash = bitcoin.crypto.hash256(buf);

    return hash;
  }

  /// Generate Signature for change of state chain ownership
  sign(proof_key_der: BIP32Interface): string {
    let msg = this.to_message()
    let sig = proof_key_der.sign(msg, false);

    // Encode into bip66 and remove hashType marker at the end to match Server's bitcoin::Secp256k1::Signature construction.
    let encoded_sig = script.signature.encode(sig,1);
    encoded_sig = encoded_sig.slice(0, encoded_sig.length-1);

    return encoded_sig.toString("hex")
 
  }


  verify_sig(proof_key_der: BIP32Interface, sig: string): boolean {
    let sig_buf = Buffer.from(sig, "hex");

    // Re-insert hashType marker ("01" suffix) and decode from bip66
    sig_buf = Buffer.concat([sig_buf, Buffer.from("01", "hex")]);
    let decoded = script.signature.decode(sig_buf);

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
  status: string,
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

  let proof_key_der_pub = proof_key_der.publicKey.toString("hex");
  let proof_key_priv = proof_key_der.privateKey?.toString("hex");


  let swap_token_class = new SwapToken(swap_token.id, swap_token.amount, swap_token.time_out, swap_token.statechain_ids);
  let st_str = JSON.stringify(swap_token_class);

  let swap_token_sig = swap_token_class.sign(proof_key_der);
  let ver = swap_token_class.verify_sig(proof_key_der, swap_token_sig);

  let blindedspenttokenmessage = new BlindedSpentTokenMessage(swap_token.id);

  //Requester
  let m = JSON.stringify(blindedspenttokenmessage);

  // Requester setup BST generation
  //let bst_req_class = new BSTRequestorData();
  let r_prime_str: string = JSON.stringify(swap_info.bst_sender_data.r_prime);
  let bst_req_json = wasm_client.BSTRequestorData.setup(r_prime_str, m)
  let my_bst_data: BSTRequestorData = JSON.parse(
    bst_req_json
  );
  typeforce(types.BSTRequestorData, my_bst_data);
  
  let swapMsg1 = {
    "swap_id": swap_token.id,
    "statechain_id": statechain_id,
    "swap_token_sig": swap_token_sig,
    "transfer_batch_sig": transfer_batch_sig,
    "address": new_address,
    "bst_e_prime": my_bst_data.e_prime,
  }
  typeforce(types.SwapMsg1, swapMsg1);

  let _ =  await http_client.post(POST_ROUTE.SWAP_FIRST, swapMsg1);

  return my_bst_data;
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
  let bstMsg = {
    "swap_id": swap_id,
    "statechain_id": statechain_id,
  };
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
  let my_bst_data_str = JSON.stringify(my_bst_data);
  let blinded_spend_signature_str = JSON.stringify(blinded_spend_signature.s_prime);

  let unblinded_sig = JSON.parse(wasm_client.BSTRequestorData.requester_calc_s(
    JSON.stringify(blinded_spend_signature.s_prime),
    JSON.stringify(my_bst_data.u),
    JSON.stringify(my_bst_data.v)
  ));

  let bst_json = wasm_client.BSTRequestorData.make_blind_spend_token(JSON.stringify(my_bst_data),JSON.stringify(unblinded_sig.unblinded_sig));
  let bst: BlindedSpendToken = JSON.parse(bst_json);
  
  let swapMsg2 = {
    "swap_id":swap_id,
    "blinded_spend_token":bst,
  };
  let result =  await http_client.post(POST_ROUTE.SWAP_SECOND, swapMsg2);
  typeforce(types.SCEAddress, result);
  
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
export interface BSTMsg {
  swap_id: String, //Uuid,
  statechain_id: String, //Uuid,
}

export interface SwapID{
  id: String | null, //Option<Uuid>,
}

export interface StatechainID{
  id: String, //Option<Uuid>,
}
