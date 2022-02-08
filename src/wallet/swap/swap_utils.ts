// Conductor Swap protocols
import { ElectrumClient, MockElectrumClient, HttpClient, MockHttpClient, StateCoin, POST_ROUTE, GET_ROUTE, STATECOIN_STATUS, StateCoinList } from '..';
import { ElectrsClient } from '../electrs'
import { EPSClient } from '../eps'
import { transferReceiver, TransferFinalizeData,  SCEAddress } from "../mercury/transfer"
import { getStateCoin } from "../mercury/info_api";
import { StateChainSig } from "../util";
import { BIP32Interface, Network, script, ECPair } from 'bitcoinjs-lib';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from '../wallet'
import { MockWasm } from '..';

let bitcoin = require("bitcoinjs-lib");
let types = require("../types")
let typeforce = require('typeforce');
const version = require("../../../package.json").version;

// Logger import.
// Node friendly importing required for Jest tests.
declare const window: any;
export let log: any;
try {
  log = window.require('electron-log');
} catch (e: any) {
  log = require('electron-log');
}

export const pingServer = async (
  http_client: HttpClient | MockHttpClient,
) => {
  return await http_client.get(GET_ROUTE.SWAP_PING, {})
}

function delay(s: number) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

export const UI_SWAP_STATUS = {
  Init: "Init",
  Phase0: "Phase0",
  Phase1: "Phase1",
  Phase2: "Phase2",
  Phase3: "Phase3",
  Phase4: "Phase4",
  Phase5: "Phase5",
  Phase6: "Phase6",
  Phase7: "Phase7",
  Phase8: "Phase8",
  End: "End",
}
Object.freeze(UI_SWAP_STATUS);

// SWAP_STATUS represent each technical stage in the lifecycle of a coin in a swap.
export enum SWAP_STATUS {
  Init = "Init",
  Phase0 = "Phase0",
  Phase1 = "Phase1",
  Phase2 = "Phase2",
  Phase3 = "Phase3",
  Phase4 = "Phase4",
  End = "End",
}
Object.freeze(SWAP_STATUS);

export const SWAP_TIMEOUT = {
  RETRY_DELAY: 1,
  STEP_TIMEOUT_S: 100,
}
Object.freeze(SWAP_TIMEOUT);

// Constants used for retrying swap phases
export const SWAP_RETRY = {
  INIT_RETRY_AFTER: 600,
  MAX_REPS_PER_STEP: SWAP_TIMEOUT.STEP_TIMEOUT_S/SWAP_TIMEOUT.RETRY_DELAY,
  LONG_DELAY_S: 5,
  RETRY_DELAY: SWAP_TIMEOUT.RETRY_DELAY
}
Object.freeze(SWAP_RETRY);

export class Timer {
  startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  reset = () => {
    this.startTime = Date.now()
  }

  millseconds_elapsed = () => {
    const result = Date.now() - this.startTime
    return result
  }

  seconds_elapsed = () => {
    const result = this.millseconds_elapsed() / 1000
    return result
  }
}

// Check statecoin is eligible for entering a swap group
export const validateSwap = (statecoin: StateCoin) => {
  if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already in swap pool.");
  if (statecoin.status === STATECOIN_STATUS.IN_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already involved in swap.");
  if (statecoin.status !== STATECOIN_STATUS.AVAILABLE) throw Error("Coin " + statecoin.getTXIdAndOut() + " not available for swap.");
}

// Each step in the swap has an expected initial statecoin status and a function to be performed
export class SwapStep {
  phase: string
  subPhase: string
  statecoin_status: Function
  swap_status: Function
  statecoin_properties: Function
  doit: Function

  constructor( 
    phase: string,
    subPhase: string,
    statecoin_status: Function,
    swap_status: Function,
    statecoin_properties: Function,
    doit: Function) {
      this.phase = phase
      this.subPhase = subPhase
      this.statecoin_status = statecoin_status
      this.swap_status = swap_status
      this.statecoin_properties = statecoin_properties
      this.doit = doit
    }

  description = () => {
    return `phase ${this.phase}:${this.subPhase}`
  }
}

const SWAP_STEP_STATUS = {
  Ok: "Ok",
  Retry: "Retry",
}

export class SwapStepResult{
  status: string
  message: string

  constructor(status: string, message: string = ""){
    this.status = status
    this.message = message
  }

  static Ok(message: string = ""){
    return new SwapStepResult(SWAP_STEP_STATUS.Ok, message)
  }

  static Retry(message: string = ""){
    return new SwapStepResult(SWAP_STEP_STATUS.Retry, message)
  }

  is_ok = () => {
    return (this.status === SWAP_STEP_STATUS.Ok)
  }

  includes = (text: string) => {
    return this.message.includes(text)
  }
}

export class SwapPhaseClients {
  http_client: HttpClient | MockHttpClient;
  electrum_client: ElectrsClient | ElectrumClient | EPSClient | MockElectrumClient

  constructor(http_client: HttpClient | MockHttpClient, 
    electrum_client: ElectrsClient | ElectrumClient | EPSClient | MockElectrumClient ) {
    this.http_client = http_client;
    // todo check these
    this.electrum_client = electrum_client;
  }

  static from_wallet(wallet: Wallet){  
    return new SwapPhaseClients(wallet.http_client, wallet.electrum_client)
  }
}

export const make_swap_commitment = (statecoin: any,
  swap_info: any, wasm_client: any): BatchData => {

  let commitment_str: string = statecoin.statechain_id;
  swap_info.swap_token.statechain_ids.forEach(function (item: string) {
    commitment_str.concat(item);
  });
  let batch_data_json: string = wasm_client.Commitment.make_commitment(commitment_str);

  let batch_data: BatchData = JSON.parse(batch_data_json);
  typeforce(types.BatchData, batch_data);
  return batch_data;
}

export const clear_statecoin_swap_info = (statecoin: StateCoin): null => {
  statecoin.swap_info = null;
  statecoin.swap_status = null;
  statecoin.ui_swap_status = null;
  return null;
}

//conductor::register_utxo,
//conductor::swap_first_message,
//conductor::swap_second_message,

/// Struct serialized to string to be used as Blind sign token message
export class BlindedSpentTokenMessage {
  swap_id: string;
  nonce: string;

  constructor(swap_id: string) {
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
  to_message(): Buffer {

    let buf = Buffer.from(this.amount + "" + this.time_out + JSON.stringify(this.statechain_ids), "utf8")
    let hash = bitcoin.crypto.hash256(buf);

    return hash;
  }

  /// Generate Signature for change of state chain ownership
  sign(proof_key_der: BIP32Interface): string {
    let msg = this.to_message()
    let sig = proof_key_der.sign(msg, false);

    // Encode into bip66 and remove hashType marker at the end to match Server's bitcoin::Secp256k1::Signature construction.
    let encoded_sig = script.signature.encode(sig, 1);
    encoded_sig = encoded_sig.slice(0, encoded_sig.length - 1);

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
export interface StateChainDataAPI {
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
  let statecoin_data = await getStateCoin(http_client, statechain_id);

  let swap_token_class = new SwapToken(swap_token.id, swap_token.amount, swap_token.time_out, swap_token.statechain_ids);
  let swap_token_sig = swap_token_class.sign(proof_key_der);
  if (!swap_token_class.verify_sig(proof_key_der, swap_token_sig)) throw Error("Swap token error. Verification failure.");

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

  await http_client.post(POST_ROUTE.SWAP_FIRST, swapMsg1)

  return my_bst_data;
}

/// blind spend signature
export interface BlindedSpendSignature {
  s_prime: Secp256k1Point,
}

export const get_blinded_spend_signature = async (
  http_client: HttpClient | MockHttpClient,
  swap_id: String,
  statechain_id: String,
): Promise<BlindedSpendSignature> => {
  let bstMsg = {
    "swap_id": swap_id,
    "statechain_id": statechain_id,
  };
  let result = await http_client.post(POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE, bstMsg);
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

  let unblinded_sig_json = wasm_client.BSTRequestorData.requester_calc_s(
    JSON.stringify(blinded_spend_signature.s_prime),
    JSON.stringify(my_bst_data.u),
    JSON.stringify(my_bst_data.v));
  let unblinded_sig = JSON.parse(unblinded_sig_json);

  let bst_json = wasm_client.BSTRequestorData.make_blind_spend_token(JSON.stringify(my_bst_data), JSON.stringify(unblinded_sig.unblinded_sig));
  let bst: BlindedSpendToken = JSON.parse(bst_json);

  let swapMsg2 = {
    "swap_id": swap_id,
    "blinded_spend_token": bst,
  };
  let result = await http_client.post(POST_ROUTE.SWAP_SECOND, swapMsg2);
  typeforce(types.SCEAddress, result);

  return result;
}

// curv::elliptic::curves::secp256_k1::Secp256k1Point
export interface Secp256k1Point {
  x: string,
  y: string
}

/// (s,r) blind spend token
export interface BlindedSpendToken {
  s: string,
  r: Secp256k1Point,
  m: string,
}

/// Owner -> Conductor
export interface SwapMsg2 {
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
  commitment: string,
  nonce: Buffer,
}

export interface SwapErrorMsg {
  error: boolean,
  msg: string
}

export interface SwapStatus {
  Phase0: "Phase0",
  Phase1: "Phase1",
  Phase2: "Phase2",
  Phase3: "Phase3",
  Phase4: "Phase4",
  End: "End",
}

export interface UISwapStatus {
  Init: "Init",
  Phase0: "Phase0",
  Phase1: "Phase1",
  Phase2: "Phase2",
  Phase3: "Phase3",
  Phase4: "Phase4",
  Phase5: "Phase5",
  Phase6: "Phase6",
  Phase7: "Phase7",
  Phase8: "Phase8",
  End: "End",
}

export interface BSTMsg {
  swap_id: string, //Uuid,
  statechain_id: String, //Uuid,
}

export interface SwapID {
  id: string, //Option<Uuid>,
}

export interface StatechainID {
  id: string, //Option<Uuid>,
}

export interface SwapGroup {
  amount: number,
  size: number,
}

export interface GroupInfo {
  number: number,
  time: number,
}