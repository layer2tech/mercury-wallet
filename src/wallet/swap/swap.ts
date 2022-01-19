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
import { encodeSCEAddress } from '../';
import { AsyncSemaphore } from '@esfx/async-semaphore';
import { List } from 'reselect/es/types';
import { callGetConfig } from '../../features/WalletDataSlice';
import { ok } from 'assert';
import { SwapID } from '../types';
import { parseJsonSourceFileConfigFileContent } from 'typescript';
import { get_swap_steps } from './swap_steps'

let bitcoin = require("bitcoinjs-lib");

let types = require("../types")
let typeforce = require('typeforce');
const version = require("../../../package.json").version;

// Logger import.
// Node friendly importing required for Jest tests.
declare const window: any;
let log: any;
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
export const SWAP_STATUS = {
  Init: "Init",
  Phase0: "Phase0",
  Phase1: "Phase1",
  Phase2: "Phase2",
  Phase3: "Phase3",
  Phase4: "Phase4",
  End: "End",
}
Object.freeze(SWAP_STATUS);

class SwapRetryError extends Error {
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

class SwapTimingConstants {
  INIT_RETRY_AFTER: number
  MAX_ERRS: number
  MAX_ERRS_PHASE4: number
  MAX_REPS_PER_PHASE: number
  MAX_REPS_PHASE4: number
  SHORT_DELAY_S: number
  MEDIUM_DELAY_S: number
  LONG_DELAY_S: number

  constructor(){
    this.INIT_RETRY_AFTER = 600
    this.MAX_ERRS = 10
    this.MAX_ERRS_PHASE4 = 100
    this.MAX_REPS_PER_PHASE = 50
    this.MAX_REPS_PHASE4 = 100
    this.SHORT_DELAY_S = 1
    this.MEDIUM_DELAY_S = 2
    this.LONG_DELAY_S = 10
  }
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

class SwapStepResult{
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



export class Swap {
  swap_steps: SwapStep[]
  http_client: HttpClient | MockHttpClient
  electrum_client: ElectrumClient | ElectrsClient | EPSClient | MockElectrumClient
  wasm_client: any
  wallet: Wallet
  statecoin: StateCoin
  network: Network
  proof_key_der: BIP32Interface
  new_proof_key_der: BIP32Interface
  swap_size: number
  req_confirmations: number
  timing_constants: SwapTimingConstants
  next_step: number
  block_height: any
  blinded_spend_signature: BlindedSpendSignature | null
  statecoin_out: StateCoin | null
  n_reps: number
  swap0_count: number
  n_retries: number
  

  constructor(wallet: Wallet,
    statecoin: StateCoin, proof_key_der: BIP32Interface, new_proof_key_der: BIP32Interface) {
      this.wallet = wallet
      this.http_client = wallet.http_client
      this.electrum_client = wallet.electrum_client
      this.wasm_client = wallet.getWasm()
      this.proof_key_der = proof_key_der
      this.new_proof_key_der = new_proof_key_der
      this.timing_constants = new SwapTimingConstants()
      this.statecoin = statecoin
      this.network = wallet.config.network
      this.swap_size = wallet.config.min_anon_set
      this.req_confirmations = wallet.config.required_confirmations
      this.next_step = 0
      this.blinded_spend_signature = null
      this.statecoin_out = null
      this.swap_steps = get_swap_steps(this)
      this.n_reps = 0
      this.swap0_count = 0
      this.n_retries = 0
    }
    
    getStep = (n: number) => {
      return this.swap_steps[n]
    }

    getNextStep = () => {
      return this.swap_steps[this.next_step]
    }

    checkStatecoinStatus = (step: SwapStep) => {
      if(!step.statecoin_status()){
        throw Error(`${step.description()}: invalid statecoin status: ${this.statecoin.status}`)
      }
    }

    checkSwapStatus = (step: SwapStep) => {
      if(!step.swap_status()){
        throw Error(`${step.description()}: invalid swap status: ${this.statecoin.swap_status}`)
      }
    }

    checkStatecoinProperties = (step: SwapStep) => {
      if(!step.statecoin_properties()) {
        throw Error(`${step.description()}: invalid statecoin properties: ${JSON.stringify(this.statecoin)}`)
      }
    }

    checkCurrentStatus = () => {
      let step = this.getNextStep()
      this.checkStatecoinStatus(step)
      this.checkSwapStatus(step)
      this.checkStatecoinProperties(step)
    }

    doNext = async () => {
      this.checkCurrentStatus()
      let step_result = await this.getNextStep().doit()
      log.info(`${JSON.stringify(step_result)}`)
      if(step_result.is_ok()){
        this.incrementStep()
        this.incrementCounters()
        this.n_retries = 0
      } else {
        this.incrementRetries(step_result)
        if (step_result.includes("Incompatible")) {
          alert(step_result.message)
        }
        if (step_result.includes("punishment")) {
          alert(step_result.message)
        }
      }   
    }

    incrementRetries = (step_result:SwapStepResult) => {
      //Allow unlimited network errors in phase 4
      if(this.statecoin.swap_status === SWAP_STATUS.Phase4){
        if (!(step_result.message.includes('Network') || 
          step_result.message.includes('network') || 
          step_result.message.includes('net::ERR'))) {
            this.n_retries = this.n_retries + 1
        }
      } else {
        this.n_retries = this.n_retries + 1
      }   
    }

    incrementStep = () => {
      this.next_step = this.next_step + 1
    }

  checkProofKeyDer = (): SwapStepResult => {
    try {
      typeforce(typeforce.compile(typeforce.Buffer), this.proof_key_der?.publicKey);
      typeforce(typeforce.compile(typeforce.Function), this.proof_key_der?.sign);
    } catch(err) {
      throw new Error(`swapInit: proof_key_der type error: ${err}`)
    } 
    return SwapStepResult.Ok()
  }

  swapRegisterUtxo = async (): Promise<SwapStepResult> => {
    let publicKey = this.proof_key_der.publicKey.toString('hex');
    let sc_sig = StateChainSig.create(this.proof_key_der, "SWAP", publicKey);
  
    let registerUtxo = {
      statechain_id: this.statecoin.statechain_id,
      signature: sc_sig,
      swap_size: this.swap_size,
      wallet_version: version.replace("v", "")
    };
  
    try {
      await swapRegisterUtxo(this.http_client, registerUtxo);
    } catch (err: any) {
      return SwapStepResult.Retry(err.message)
    }
  
    log.info("Coin registered for Swap. Coin ID: ", this.statecoin.shared_key_id)
  
    this.statecoin.swap_status = SWAP_STATUS.Phase0;
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase0;
    return SwapStepResult.Ok()
  }

  // Poll Conductor awaiting for swap pool to initialise.
pollUtxo = async (): Promise<SwapStepResult> => {
  // PollUtxo. If swap has begun store SwapId in Statecoin
  try {
    let swap_id = await pollUtxo(this.http_client, 
      {id: this.statecoin.statechain_id});
    if (swap_id.id !== null) {
      log.info("Swap Phase0: Swap ID received: ", swap_id)
      this.statecoin.swap_id = swap_id
      this.statecoin.swap_status = SWAP_STATUS.Phase1;
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase1;
      return SwapStepResult.Ok()
    } else {
      return SwapStepResult.Retry()
    }
  } catch (err: any) {
     return SwapStepResult.Retry(err.message)
    }
  }


  // Poll Conductor awaiting swap info. When it is available carry out phase1 tasks:
// Return an SCE-Address and produce a signature over the swap_token with the
//  proof key that currently owns the state chain they are transferring in the swap.
pollUtxoPhase1 = async (): Promise<SwapStepResult> => {
  //Check swap id again to confirm that the coin is still awaiting swap
  //according to the server
  let swap_id;
  try {
    swap_id = await pollUtxo(this.http_client, {id: this.statecoin.statechain_id});
  } catch (err: any) {
    return SwapStepResult.Retry(err.message)
  }
  this.statecoin.swap_id = swap_id
  if (swap_id == null || swap_id.id == null) {
    throw new Error("In swap phase 1 - no swap ID found");
  }
  return SwapStepResult.Ok()
}

getSwapID(): SwapID {
  const swap_id = this.statecoin.swap_id  
  if (swap_id === null || swap_id === undefined){
      throw new Error("expected SwapID, got null or undefined")
    }
  return swap_id
}
getSwapInfo(): SwapInfo {
  const swap_info = this.statecoin.swap_info
    if (swap_info === null || swap_info === undefined){
      throw new Error("expected SwapInfo, got null or undefined")
    }
  return swap_info
}
getBlindedSpendSignature(): BlindedSpendSignature {
  const bss = this.blinded_spend_signature
    if (bss === null || bss === undefined){
      throw new Error("expected BlindedSpendSignature, got null or undefined")
    }
  return bss
}
getBSTRequestorData(): BSTRequestorData {
  const data = this.statecoin.swap_my_bst_data  
  if (data === null || data === undefined){
      throw new Error("expected BSTRequestorData, got null or undefined")
    }
  return data
}
getSwapReceiverAddr(): SCEAddress {
  const addr = this.statecoin.swap_receiver_addr
  if (addr === null || addr === undefined){
    throw new Error("expected SCEAddress, got null or undefined")
  }
  return addr
}

getSwapBatchTransferData(): BatchData {
  const batch_data = this.statecoin.swap_batch_data
  if (batch_data === null || batch_data === undefined){
    throw new Error("expected SCEAddress, got null or undefined")
  }
  return batch_data
}

getTransferFinalizedData(): TransferFinalizeData {
  const data = this.statecoin.swap_transfer_finalized_data
  if (data === null || data === undefined){
    throw new Error("expected TransferFinalizeData, got null or undefined")
  }
  return data
}


loadSwapInfo = async ():Promise<SwapStepResult> => {
  try {
    let swap_info = await getSwapInfo(this.http_client, this.getSwapID());
    if (swap_info === null) {
      return SwapStepResult.Retry("awaiting swap info...")
    } 
    typeforce(types.SwapInfo, swap_info);
    this.statecoin.swap_info = swap_info;
    this.statecoin.setInSwap();
    return SwapStepResult.Ok(`swap info received`)
  } catch (err: any) {
    return SwapStepResult.Retry(err.message)
  }
}
 
getBSTData = async (): Promise<SwapStepResult> => {
  let address = {
    "tx_backup_addr": null,
    "proof_key": this.new_proof_key_der.publicKey.toString("hex"),
  };
  typeforce(types.SCEAddress, address);

  let transfer_batch_sig = StateChainSig.new_transfer_batch_sig(this.proof_key_der, 
    this.getSwapID().id, this.statecoin.statechain_id);
  try {
    let my_bst_data = await first_message(
      this.http_client,
      this.wasm_client,
      this.getSwapInfo(),
      this.statecoin.statechain_id,
      transfer_batch_sig,
      address,
      this.proof_key_der
    );

    // Update coin with address, bst data and update status
    this.statecoin.swap_address = address;
    this.statecoin.swap_my_bst_data = my_bst_data;
    this.statecoin.swap_status = SWAP_STATUS.Phase2;
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase2;
    return SwapStepResult.Ok()
  } catch (err: any) {
    return SwapStepResult.Retry(err.message)
  }
}

// Poll swap until phase changes to Phase2. In that case all participants have completed Phase1
// and swap second message can be performed.
pollSwapPhase2 = async (): Promise<SwapStepResult> => {
  // Poll swap until phase changes to Phase2.
  let phase: string
  try {
    phase = await pollSwap(this.http_client, this.getSwapID());
  } catch (err: any) {
    return SwapStepResult.Retry(err.message)
  }
  return this.checkSwapPhase2(phase)
}

checkSwapPhase2 = (phase: string): SwapStepResult => {
  if (phase === SWAP_STATUS.Phase1) {
    return SwapStepResult.Retry("awaiting server phase 2...")
  } else if (phase == null) {
    throw new Error("Swap halted at phase 1");
  } else if (phase !== SWAP_STATUS.Phase2) {
    throw new Error("Swap error: Expected swap phase1 or phase2. Received: " + phase);
  }
  return SwapStepResult.Ok(`Swap Phase2: Coin ${this.statecoin.shared_key_id} + " in Swap ", ${this.statecoin.swap_id}`)
}

getBSS = async (): Promise<SwapStepResult> => { 
  let bss
  try {
    bss = await get_blinded_spend_signature(this.http_client, this.getSwapID().id, this.statecoin.statechain_id);
    this.statecoin.ui_swap_status=UI_SWAP_STATUS.Phase3;
    this.blinded_spend_signature  = bss
    return SwapStepResult.Ok('got blinded spend signature')
  } catch(err: any) {
    return SwapStepResult.Retry(err.message)
  }
}

getNewTorID = async (): Promise<SwapStepResult> => {
  try {
    await this.http_client.new_tor_id();
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4;
  } catch (err: any) {
    return SwapStepResult.Retry(`Error getting new TOR id: ${err}`)
  }
  await delay(1);
  return SwapStepResult.Ok('got new tor ID')
}

doSwapSecondMessage = async (): Promise<SwapStepResult> => {
  try {
    let receiver_addr = await second_message(this.http_client, this.wasm_client, this.getSwapID().id, 
      this.getBSTRequestorData(), this.getBlindedSpendSignature());
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5;
    // Update coin with receiver_addr and update status
    this.statecoin.swap_receiver_addr=receiver_addr;
    this.statecoin.swap_status=SWAP_STATUS.Phase3;  
    return SwapStepResult.Ok(`got receiver address`);
  } catch(err: any) {
    return SwapStepResult.Retry(err.message)
  }
}

getBlockHeight = async () => {
  this.block_height = null
  if (this.electrum_client instanceof EPSClient) {
    try {
      let header = await this.electrum_client.latestBlockHeader();
      this.block_height = header.block_height;
    } catch (err: any) {
      throw new SwapRetryError(err)
    }
  }
}


pollSwapPhase3 = async (): Promise<SwapStepResult> => {
  try {
    let phase = await pollSwap(this.http_client, this.getSwapID());
    return this.checkServerPhase4(phase)
  } catch (err: any) {
    return SwapStepResult.Retry(err.message)
  }
}

checkServerPhase4 = (phase: string): SwapStepResult => {
  if(phase === SWAP_STATUS.Phase4){
    return SwapStepResult.Ok("server in phase 4")
  } else if (phase == null) {
    throw new Error("Swap halted at phase 3");
  }
  return SwapStepResult.Retry("awaiting server phase 4")
}


transferSender = async (): Promise<SwapStepResult> => {
  try {
    // if this part has not yet been called, call it.
    this.statecoin.swap_transfer_msg = await transferSender(this.http_client, 
    this.wasm_client, this.network, this.statecoin, this.proof_key_der, 
    this.getSwapReceiverAddr().proof_key, true, this.wallet);
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase6;
    this.wallet.saveStateCoinsList()
    await delay(this.timing_constants.SHORT_DELAY_S);
    return SwapStepResult.Ok("transfer sender complete")
  } catch (err){
    return SwapStepResult.Retry(err.message)
  }
}


  makeSwapCommitment = (): SwapStepResult => {
    this.statecoin.swap_batch_data = this.make_swap_commitment();
    this.wallet.saveStateCoinsList()
    return SwapStepResult.Ok("made swap commitment")
  }

  updateBlockHeight = async () => {
    if (this.electrum_client instanceof EPSClient) {
      let header = await this.electrum_client.latestBlockHeader();
      this.block_height = header.block_height;
    } else {
      this.block_height = null
    }
  }
  
  transferReceiver = async (): Promise<SwapStepResult> => {
  try{
    this.updateBlockHeight();
    let transfer_finalized_data = await this.do_transfer_receiver();
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase7;

    if (transfer_finalized_data !== null && transfer_finalized_data !== undefined) {
      // Update coin status
      this.statecoin.swap_transfer_finalized_data = transfer_finalized_data;
      this.statecoin.swap_status = SWAP_STATUS.Phase4;
      this.wallet.saveStateCoinsList()
      return SwapStepResult.Ok(`Received transfer finalized data.`)
    } else {
      return SwapStepResult.Retry(`Received null or undefined transfer finalized data. Retrying.`)
    }
  } catch (err: any) {
    return SwapStepResult.Retry(err.message)
  }
  }

  // Poll swap until phase changes to Phase End. In that case complete swap by performing transfer finalize.
swapPhase4PollSwap = async () => {
  try {
    let phase = await pollSwap(this.http_client, this.getSwapID());
    return this.swapPhase4CheckPhase(phase)
  } catch (err: any) {
    if (!err.message.includes("No data for identifier")) {
      return SwapStepResult.Retry(err.message)
    }
  }
}

swapPhase4CheckPhase = (phase: string): SwapStepResult => {
  if (phase === SWAP_STATUS.Phase3) {
    return SwapStepResult.Retry("Client in swap phase 4. Server in phase 3. Awaiting phase 4. Retrying...")
  } else if (phase !== SWAP_STATUS.Phase4 && phase !== null) {
    throw new Error("Swap error: swapPhase4: Expected swap phase4 or null. Received: " + phase);
  }
  return SwapStepResult.Ok(`Swap Phase: ${phase} - Coin ${this.statecoin.shared_key_id} in Swap ${this.statecoin.swap_id}`);
}

setStatecoinOut = (statecoin_out: StateCoin) => {
 // Update coin status and num swap rounds
 this.statecoin.ui_swap_status = UI_SWAP_STATUS.End;
 this.statecoin.swap_status = SWAP_STATUS.End;
 statecoin_out.swap_rounds = this.statecoin.swap_rounds + 1;
 statecoin_out.anon_set = this.statecoin.anon_set + this.getSwapInfo().swap_token.statechain_ids.length;
 this.wallet.setIfNewCoin(statecoin_out)
 this.wallet.statecoins.setCoinSpent(this.statecoin.shared_key_id, ACTION.SWAP)
 // update in wallet
 statecoin_out.swap_status = null;
 statecoin_out.ui_swap_status = null;
 statecoin_out.swap_auto = this.statecoin.swap_auto
 statecoin_out.setConfirmed(); 
 statecoin_out.sc_address = encodeSCEAddress(statecoin_out.proof_key, this.wallet)
 this.statecoin_out = statecoin_out
 if (this.wallet.statecoins.addCoin(statecoin_out)) {
   this.wallet.saveStateCoinsList();
   log.info("Swap complete for Coin: " + this.statecoin.shared_key_id + ". New statechain_id: " + statecoin_out.shared_key_id);
 } else {
   log.info("Error on swap complete for coin: " + this.statecoin.shared_key_id + " statechain_id: " + statecoin_out.shared_key_id + "Coin duplicate");
 }
}

swapPhase4HandleErrPollSwap = async (): Promise<SwapStepResult> => {
  try{
    let phase = await pollSwap(this.http_client, this.getSwapID());
    return SwapStepResult.Ok(phase)
  } catch (err: any) {
    if(!err.message.includes("No data for identifier")) {
      return SwapStepResult.Retry(err.message)
    }
    throw err
  }
}

handleTimeoutError = (err: any) => {
  if (err.message.includes('Transfer batch ended. Timeout')) {
    let error = new Error(`swap id: ${this.getSwapID().id}, shared key id: ${this.statecoin.shared_key_id} - swap failed at phase 4/4 
    due to Error: ${err.message}`);
    throw error
  }
}

  
checkBatchStatus = async (phase: string): Promise<SwapStepResult> => {
  let batch_status = null
    try{
      if (phase === null) {
        batch_status = await getTransferBatchStatus(this.http_client, this.getSwapID().id);
      }
    } catch (err: any) {
      this.handleTimeoutError(err)
      return SwapStepResult.Retry(err.message)
    }
    if(batch_status?.finalized) {
      return SwapStepResult.Ok("batch transfer finalized")
    } else {
      return SwapStepResult.Retry(`statecoin ${this.statecoin.shared_key_id} waiting for completion of batch transfer in swap ID ${this.getSwapID().id}`)
    }
}

transferReceiverFinalize = async (): Promise<SwapStepResult> => { 
  // Complete transfer for swap and receive new statecoin  
  try {
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8;
    let statecoin_out = await transferReceiverFinalize(this.http_client, this.wasm_client, this.getTransferFinalizedData());
    this.setStatecoinOut(statecoin_out)
    return SwapStepResult.Ok("transfer complete")
  } catch (err: any) {
    let result = await this.swapPhase4HandleErrPollSwap()
    if(!result.is_ok()) {
      return result
    } else {
      let phase = result.message
      return this.checkBatchStatus(phase)
    }
  }
}

// Check statecoin is eligible for entering a swap group
checkEligibleForSwap = () => {
  checkEligibleForSwap(this.statecoin)
}

checkEligibleForResumeSwap = () => {
  const statecoin = this.statecoin
  if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Cannot resume coin " + statecoin.shared_key_id + " - not in swap.");
  if (statecoin.swap_status !== SWAP_STATUS.Phase4)
  throw Error("Cannot resume coin " + statecoin.shared_key_id + " - swap status: " + statecoin.swap_status);
}

prepare_statecoin = (resume: boolean) => {
  let statecoin = this.statecoin
   // Reset coin's swap data
   let prev_phase;
   if (!resume) {
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
   } else {
     prev_phase = statecoin.swap_status;
   }
}

checkNReps = () => {
  if (this.statecoin.swap_status !== SWAP_STATUS.Phase4 && this.n_reps >= this.timing_constants.MAX_REPS_PER_PHASE) {
    throw new Error(`Number of tries exceeded in phase ${this.statecoin.swap_status}`)
  }
  if (this.statecoin.swap_status === SWAP_STATUS.Phase4 && this.n_reps >= this.timing_constants.MAX_REPS_PHASE4) {
    throw new Error(`Number of tries exceeded in phase ${this.statecoin.swap_status}`)
  }
}

checkSwapLoopStatus = async () => {
  let statecoin = this.statecoin
  if (statecoin.status === STATECOIN_STATUS.AVAILABLE) {
    throw new Error("Coin removed from swap pool")
  }
  if (statecoin.swap_status === SWAP_STATUS.Phase0) {
    if (this.swap0_count >= this.timing_constants.INIT_RETRY_AFTER) {
      await this.reset()
    }
  }
}

reset = async () => {
  this.resetCounters()
  let statecoin = this.statecoin
  await swapDeregisterUtxo(this.http_client, { id: statecoin.statechain_id });
  statecoin.setSwapDataToNull();
  statecoin.swap_status = SWAP_STATUS.Init;
  statecoin.setAwaitingSwap();
}

resetCounters = () => {
  this.swap0_count = 0
  this.n_reps=0
  this.next_step=0
  this.n_retries = 0
}

incrementCounters = () => {
  const statecoin = this.statecoin
   // Keep trying to join swap indefinitely
   if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) {
    this.n_reps = 0
    return
  }
  switch (statecoin.swap_status) {
    case SWAP_STATUS.Phase0: {
      this.swap0_count++;
      return
    }
    default: {
      this.n_reps = this.n_reps + 1
      return
    }
  }
}



// Loop through swap protocol for some statecoin
do_swap_poll = async (resume: boolean = false): Promise<StateCoin | null> => {
  if(resume) {
    this.checkEligibleForResumeSwap()
  } else {
    this.checkEligibleForSwap()
  }
  this.prepare_statecoin(resume)
  let statecoin = this.statecoin

  while (this.statecoin_out === null){
    this.checkNReps()
    this.checkSwapLoopStatus()
    this.doNext()
    await delay(this.timing_constants.MEDIUM_DELAY_S)
  }
  if (statecoin.swap_auto) this.statecoin_out.swap_auto = true;
  return this.statecoin_out;
}

make_swap_commitment = (): BatchData => {
  let statecoin = this.statecoin
  let swap_info = this.getSwapInfo()
  let wasm_client = this.wasm_client

  let commitment_str: string = statecoin.statechain_id;
  swap_info.swap_token.statechain_ids.forEach(function (item: string) {
    commitment_str.concat(item);
  });
  let batch_data_json: string = wasm_client.Commitment.make_commitment(commitment_str);

  let batch_data: BatchData = JSON.parse(batch_data_json);
  typeforce(types.BatchData, batch_data);
  return batch_data;
}

do_transfer_receiver = async (): Promise<TransferFinalizeData | null> => {
  let http_client = this.http_client
  let electrum_client = this.electrum_client
  let network = this.network
  let batch_id = this.getSwapID()
  let statechain_ids = this.getSwapInfo().swap_token.statechain_ids
  let rec_se_addr = this.getSwapReceiverAddr()
  let rec_se_addr_bip32 = this.new_proof_key_der
  let req_confirmations = this.req_confirmations
  let block_height = this.block_height
  let commit = this.getSwapBatchTransferData().commitment
  let value = this.statecoin.value

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

}
// Limit total swap instances and only run if updateSwapInfo is not running
// run deRegister SwapCoin if above criteria met

// Semaphore 1 triggered and semaphore 1 count adds 1 for each call of this function
// Semaphore 2 is counted separately from this function but there is a check to make 
// sure the sem. 2 limit has not  been reached
export const asyncSemaphoreRun = async (
  semaphore1: AsyncSemaphore,
  semaphore2: AsyncSemaphore,
  SEM_2_LIMIT: number,
  func1: Function,
  args1: List
) => {
  await semaphore1.wait();
  try {
    await (async () => {
      while (semaphore2.count < SEM_2_LIMIT) {
        delay(100);
      }
    });
    func1(...args1)
  }
  catch (e: any) {
    if (!e.message.includes("Coin is not in a swap pool")) {
      //this error is thrown when sc status = Awaiting Swap
      throw e;
    }
  } finally {
    semaphore1.release();
  }
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

export const checkEligibleForSwap = (statecoin: StateCoin) => {
  if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already in swap pool.");
  if (statecoin.status === STATECOIN_STATUS.IN_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already involved in swap.");
  if (statecoin.status !== STATECOIN_STATUS.AVAILABLE) throw Error("Coin " + statecoin.getTXIdAndOut() + " not available for swap.");
}