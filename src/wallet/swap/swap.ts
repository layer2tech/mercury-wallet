// Conductor Swap protocols
import { ElectrumClient, MockElectrumClient, HttpClient, MockHttpClient, StateCoin, POST_ROUTE, GET_ROUTE, STATECOIN_STATUS, StateCoinList } from '..';
import { ElectrsClient } from '../electrs'
import { EPSClient } from '../eps'
import { transferSender, transferReceiver, TransferFinalizeData, transferReceiverFinalize, SCEAddress } from "../mercury/transfer"
import { pollUtxo, pollSwap, getSwapInfo, swapRegisterUtxo, swapDeregisterUtxo } from "./info_api";
import { getStateCoin, getTransferBatchStatus } from "../mercury/info_api";
import { StateChainSig } from "../util";
import { BIP32Interface, Network, script, ECPair } from 'bitcoinjs-lib';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from '../wallet'
import { ACTION } from '../activity_log';
import { List } from 'reselect/es/types';
import { callGetConfig } from '../../features/WalletDataSlice';
import { swapPhase0 } from './swap.phase0';
import { swapPhase1 } from './swap.phase1';
import { swapPhase2 } from './swap.phase2';
import { swapPhase3 } from './swap.phase3';
import { swapPhase4 } from './swap.phase4';


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

// Constants used for retrying swap phases
export const SWAP_RETRY = {
  INIT_RETRY_AFTER: 600,
  MAX_ERRS_PER_PHASE: 10,
  MAX_ERRS_PHASE4: 100,
  MAX_REPS_PER_PHASE: 50,
  MAX_REPS_PHASE4: 100
}
Object.freeze(SWAP_RETRY);

export class SwapRetryError extends Error {
  constructor(err: any, reason: string | null = null) {
    const msg = err?.message
    let message: string
    if (msg) {
      message = msg
    } else {
      message = JSON.stringify(err)
    }
    if (reason) {
      message = reason.concat(message)
    }
    super(message)
    this.name = "SwapRetryError";
  }
}

export const validateStatecoinState = (statecoin: StateCoin, phase: SWAP_STATUS) => {
  // assume statecoin state is valid because it will throw if invalid
  let valid = true;

  if (statecoin.status !== STATECOIN_STATUS.AWAITING_SWAP) throw Error("Statecoin status is not in awaiting swap");
  if (statecoin.swap_status !== phase) throw Error("Coin is not yet in this phase of the swap protocol. In phase: " + statecoin.swap_status);

  switch (phase) {
    case SWAP_STATUS.Phase0:
      if (statecoin.statechain_id === null || statecoin.statechain_id === undefined) throw Error("statechain id is invalid");
      break;
    case SWAP_STATUS.Phase1:
    case SWAP_STATUS.Phase2:
    case SWAP_STATUS.Phase3:
      if (statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
      break;
    case SWAP_STATUS.Phase4:
      break;
  }

  return valid;
}

// Check statecoin is eligible for entering a swap group
export const validateSwap = (statecoin: StateCoin) => {
  if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already in swap pool.");
  if (statecoin.status === STATECOIN_STATUS.IN_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already involved in swap.");
  if (statecoin.status !== STATECOIN_STATUS.AVAILABLE) throw Error("Coin " + statecoin.getTXIdAndOut() + " not available for swap.");
}


// Register coin to swap pool and set to phase0
export const swapInit = async (
  http_client: HttpClient | MockHttpClient,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  swap_size: number
) => {
  if (statecoin.status !== STATECOIN_STATUS.AWAITING_SWAP) throw Error(`swapInit - expected statecoin status ${STATECOIN_STATUS.AWAITING_SWAP}, got status: ${statecoin.status}`);
  if (statecoin.swap_status !== null && statecoin.swap_status !== SWAP_STATUS.Init)
    throw Error("Coin is already involved in a swap. Swap status: " + statecoin.swap_status);

  try {
    typeforce(typeforce.compile(typeforce.Buffer), proof_key_der?.publicKey);
    typeforce(typeforce.compile(typeforce.Function), proof_key_der?.sign);

  } catch (err) {
    throw new Error(`swapInit: proof_key_der type error: ${err}`)
  }

  let publicKey = proof_key_der.publicKey.toString('hex');
  let sc_sig = StateChainSig.create(proof_key_der, "SWAP", publicKey);

  let registerUtxo = {
    statechain_id: statecoin.statechain_id,
    signature: sc_sig,
    swap_size: swap_size,
    wallet_version: version.replace("v", "")
  };

  try {
    await swapRegisterUtxo(http_client, registerUtxo);
  } catch (err: any) {
    throw new SwapRetryError(err)
  }

  log.info("Coin registered for Swap. Coin ID: ", statecoin.shared_key_id)

  statecoin.swap_status = SWAP_STATUS.Phase0;
  statecoin.ui_swap_status = UI_SWAP_STATUS.Phase0;
}

export class SwapPhaseClients {
  http_client: HttpClient | MockHttpClient | any;
  wasm_client: any;
  electrum_client: any;

  constructor(_http_client: HttpClient, _wasm_client: any = null, _electrum_client: any = null) {
    this.http_client = _http_client;
    // todo check these
    this.wasm_client = _wasm_client;
    this.electrum_client = _electrum_client;
  }
}

export const validateStateCoin = (statecoin: StateCoin) => {

}

// Loop through swap protocol for some statecoin
export const do_swap_poll = async (
  http_client: HttpClient | MockHttpClient | any,
  electrum_client: ElectrumClient | ElectrsClient | EPSClient | MockElectrumClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  swap_size: number,
  new_proof_key_der: BIP32Interface,
  req_confirmations: number,
  wallet: Wallet,
  resume: boolean = false
): Promise<StateCoin | null> => {

  let swapPhaseClient = new SwapPhaseClients(http_client, wasm_client, electrum_client);

  let prev_phase = handleResumeOrStartSwap(resume, statecoin)

  let swap0_count = 0
  let n_errs = 0
  let n_reps = 0
  let new_statecoin = null
  while (new_statecoin == null) {
    try {
      if (statecoin.swap_status !== SWAP_STATUS.Phase4 && n_reps >= SWAP_RETRY.MAX_REPS_PER_PHASE) {
        throw new Error(`Number of tries exceeded in phase ${statecoin.swap_status}`)
      }
      if (statecoin.swap_status === SWAP_STATUS.Phase4 && n_reps >= SWAP_RETRY.MAX_REPS_PHASE4) {
        throw new Error(`Number of tries exceeded in phase ${statecoin.swap_status}`)
      }
      if (statecoin.status === STATECOIN_STATUS.AVAILABLE) {
        throw new Error("Coin removed from swap pool")
      }
      if (statecoin.swap_status == SWAP_STATUS.Init ||
        statecoin.swap_status == SWAP_STATUS.Phase0 ||
        statecoin.swap_status != prev_phase) {
        n_reps = 0
        prev_phase = statecoin.swap_status
      }
      n_reps = n_reps + 1
      console.log(`swap status: ${statecoin.swap_status}`);

      switch (statecoin.swap_status) {
        case null: {  // Coin has been removed from swap
          return null;
        }
        case SWAP_STATUS.Init: {
          n_reps = n_reps - 1
          await swapInit(http_client, statecoin, proof_key_der, swap_size);
          n_errs = 0;
          break;
        }
        case SWAP_STATUS.Phase0: {
          n_reps = n_reps - 1
          if (swap0_count < SWAP_RETRY.INIT_RETRY_AFTER) {
            try {
              await swapPhase0(swapPhaseClient, statecoin);
              n_errs = 0;
            } finally {
              swap0_count++;
            }
          } else {
            swap0_count = 0;
            await swapDeregisterUtxo(http_client, { id: statecoin.statechain_id });
            if (statecoin) {
              statecoin.setSwapDataToNull();
              statecoin.swap_status = SWAP_STATUS.Init;
              statecoin.setAwaitingSwap();
            }
            n_errs = 0;
          }

          break;
        }
        case SWAP_STATUS.Phase1: {
          await swapPhase1(swapPhaseClient, statecoin, proof_key_der, new_proof_key_der);
          n_errs = 0;
          break;
        }
        case SWAP_STATUS.Phase2: {
          await swapPhase2(http_client, wasm_client, statecoin);
          n_errs = 0;
          break;
        }
        case SWAP_STATUS.Phase3: {
          if (statecoin.swap_address === null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
          let block_height = null
          if (electrum_client instanceof EPSClient) {
            try {
              let header = await electrum_client.latestBlockHeader();
              block_height = header.block_height;
            } catch (err: any) {
              throw new SwapRetryError(err)
            }
          }
          await swapPhase3(swapPhaseClient, statecoin, network, proof_key_der, new_proof_key_der, req_confirmations, block_height, wallet);
          n_errs = 0;
          break;
        }
        case SWAP_STATUS.Phase4: {
          new_statecoin = await swapPhase4(http_client, wasm_client, statecoin, wallet);
          n_errs = 0;
        }
      }
    } catch (err: any) {
      let message: string | undefined = err?.message
      if (message && (message.includes("timed out") || message.includes("Transfer batch ended. Timeout"))) {
        throw err
      } else if (err instanceof SwapRetryError && n_errs < SWAP_RETRY.MAX_ERRS_PER_PHASE && statecoin.swap_status !== SWAP_STATUS.Phase4) {
        n_errs = n_errs + 1
        console.log(`Error during swap: ${message} - retrying...`);
        if (message!.includes("Incompatible")) {
          alert(message)
        }
        if (message!.includes("punishment")) {
          alert(message)
        }
      }
      else if (err instanceof SwapRetryError && n_errs < SWAP_RETRY.MAX_ERRS_PHASE4 && statecoin.swap_status === SWAP_STATUS.Phase4) {
        //An unlimited number of netowrk errors permitted in stage 4 as swap 
        //transfers may have completed
        if (!(err.message.includes('Network') || err.message.includes('network') || err.message.includes('net::ERR'))) {
          n_errs = n_errs + 1
        }
        console.log(`Error during swap: ${message} - retrying...`);
      } else {
        throw err
      }
    }

    await delay(2);
  }
  if (statecoin.swap_auto) new_statecoin.swap_auto = true;
  return new_statecoin;
}


export const handleResumeOrStartSwap = (resume: boolean, statecoin: StateCoin): string | null => {
  // Coins in Phase4 resume all other coins start swap

  let prev_phase;
  //coin previous swap phase

  if (resume) {
    if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Cannot resume coin " + statecoin.shared_key_id + " - not in swap.");
    if (statecoin.swap_status !== SWAP_STATUS.Phase4)
      throw Error("Cannot resume coin " + statecoin.shared_key_id + " - swap status: " + statecoin.swap_status);
    prev_phase = statecoin.swap_status;
  } else {
    validateSwap(statecoin)
    if (statecoin.swap_status === SWAP_STATUS.Phase4) {
      throw new Error(`Coin ${statecoin.shared_key_id} is in swap phase 4. Swap must be resumed.`)
    }
    if (statecoin) {
      statecoin.setSwapDataToNull()
      statecoin.swap_status = SWAP_STATUS.Init;
      statecoin.ui_swap_status = SWAP_STATUS.Init;
      statecoin.setAwaitingSwap();
    }
    prev_phase = SWAP_STATUS.Init;
  }

  return prev_phase
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

export const do_transfer_receiver = async (
  http_client: HttpClient | MockHttpClient,
  electrum_client: ElectrumClient | ElectrsClient | EPSClient | MockElectrumClient,
  network: Network,
  batch_id: string,
  commit: string,
  statechain_ids: Array<String>,
  rec_se_addr: SCEAddress,
  rec_se_addr_bip32: BIP32Interface,
  req_confirmations: number,
  block_height: number | null,
  value: number
): Promise<TransferFinalizeData | null> => {
  for (var id of statechain_ids) {
    let msg3;
    while (true) {
      try {
        msg3 = await http_client.post(POST_ROUTE.TRANSFER_GET_MSG, { "id": id });
      } catch (err: any) {
        let message: string | undefined = err?.message
        if (message && !message.includes("DB Error: No data for identifier")) {
          throw err;
        }
        await delay(2);
        continue;
      }

      typeforce(types.TransferMsg3, msg3);
      if (msg3.rec_se_addr.proof_key === rec_se_addr.proof_key) {
        let batch_data = {
          "id": batch_id,
          "commitment": commit,
        }
        await delay(1);
        let finalize_data = await transferReceiver(http_client, electrum_client, network, msg3, rec_se_addr_bip32, batch_data, req_confirmations, block_height, value);
        typeforce(types.TransferFinalizeData, finalize_data);
        return finalize_data;
      } else {
        break;
      }
    }
  }
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
