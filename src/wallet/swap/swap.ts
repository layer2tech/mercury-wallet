import { EPSClient } from '../eps'
import {
  transferSender, transferReceiver, TransferFinalizeData,
  transferReceiverFinalize, SCEAddress, TransferMsg3,
  TransferMsg4, getTransferMsg4, transferUpdateMsg
} from "../mercury/transfer"
import { pollUtxo, pollSwap, getSwapInfo, swapRegisterUtxo } from "./info_api";
import { delay_s, getTransferBatchStatus } from "../mercury/info_api";
import { StateChainSig } from "../util";
import { BIP32Interface, Network } from 'bitcoinjs-lib';
import { Wallet } from '../wallet'
import { ACTION } from '../activity_log';
import { encodeSCEAddress, POST_ROUTE, GET_ROUTE, StateCoin, STATECOIN_STATUS } from '..';

import { get_swap_steps } from './swap_steps'
import {
  BatchData, BlindedSpendSignature, BSTRequestorData, first_message,
  get_blinded_spend_signature, second_message, SwapID, SwapInfo, SwapPhaseClients,
  SwapStep, SwapStepResult, SWAP_RETRY, SWAP_STATUS, UI_SWAP_STATUS, Timer,
  SWAP_TIMEOUT, TIMEOUT_STATUS
} from './swap_utils';
import { semaphore, MAX_SEMAPHORE_COUNT } from '../http_client'
import { AsyncSemaphore } from "@esfx/async-semaphore";
import { RateLimiter } from "limiter"

const swapStepRateLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 10000, fireImmediately: false });

const newid_semaphore = new AsyncSemaphore(1);

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


export default class Swap {
  swap_steps: SwapStep[]
  clients: SwapPhaseClients
  wallet: Wallet
  statecoin: StateCoin
  network: Network
  proof_key_der: BIP32Interface
  new_proof_key_der: BIP32Interface
  swap_size: number
  req_confirmations: number
  next_step: number
  block_height: any
  blinded_spend_signature: BlindedSpendSignature | null
  statecoin_out: StateCoin | null
  swap0_count: number
  n_retries: number
  resume: boolean
  step_timer: Timer

  constructor(wallet: Wallet,
    statecoin: StateCoin, proof_key_der: BIP32Interface,
    new_proof_key_der: BIP32Interface, resume: boolean = false) {
    this.wallet = wallet
    this.clients = SwapPhaseClients.from_wallet(wallet)
    this.proof_key_der = proof_key_der
    this.new_proof_key_der = new_proof_key_der
    this.statecoin = statecoin
    this.network = wallet.config.network
    this.swap_size = wallet.config.min_anon_set
    this.req_confirmations = wallet.config.required_confirmations
    this.next_step = 0
    this.blinded_spend_signature = null
    this.statecoin_out = null
    this.swap_steps = get_swap_steps(this)
    this.swap0_count = 0
    this.n_retries = 0
    this.resume = resume
    this.step_timer = new Timer()
  }

  setSwapSteps = (steps: SwapStep[]) => {
    this.swap_steps = steps
  }

  getStep = (n: number) => {
    return this.swap_steps[n]
  }

  getNextStep = () => {
    return this.swap_steps[this.next_step]
  }

  checkStatecoinStatus = (step: SwapStep) => {
    if (!step.statecoin_status()) {
      throw Error(`${step.description()}: invalid statecoin status: ${this.statecoin.status}`)
    }
  }

  checkSwapStatus = (step: SwapStep) => {
    if (!step.swap_status()) {
      throw Error(`${step.description()}: invalid swap status: ${this.statecoin.swap_status}`)
    }
  }

  checkStatecoinProperties = (step: SwapStep) => {
    if (!step.statecoin_properties()) {
      throw Error(`${step.description()}: invalid statecoin properties: ${JSON.stringify(this.statecoin)}`)
    }
  }

  checkWalletStatus = () => {
    if (this.wallet.active === false) {
      throw Error(`wallet unloading...`)
    }
  }

  checkStepStatus = () => {
    let step = this.getNextStep()
    this.checkStatecoinStatus(step)
    this.checkSwapStatus(step)
    this.checkStatecoinProperties(step)
  }

  doNext = async () => {
    await swapStepRateLimiter.removeTokens(1)
    this.checkWalletStatus()
    this.checkStepStatus()
    this.checkStepTimer()
    this.checkNRetries()
    this.checkSwapLoopStatus()
    const nextStep = this.getNextStep()
    let step_result = await nextStep.doit()
    await this.processStepResult(step_result, nextStep)
  }

  processStepResult = async (sr: SwapStepResult, next_step: SwapStep) => {
    if (sr.is_ok()) {
      this.incrementStep()
      this.resetRetryCounters()
      this.statecoin.clearSwapError()
    } else {
      console.log(`process step result retry - message: ${sr.message}`)
      await this.processStepResultRetry(sr, next_step)
    }
  }

  processStepResultRetry = async (step_result: SwapStepResult, nextStep: SwapStep) => {
    if (this.n_retries === 0) {
      log.info(`Retrying swap step: ${nextStep.description()} for statecoin: ${this.statecoin.shared_key_id} - reason: ${step_result.message}`)
    }
    this.incrementRetries(step_result)
    if (step_result.includes("Incompatible")) {
      alert(step_result.message)
    }
    let clear = true
    let values = Object.values(TIMEOUT_STATUS)
    for (let i = 0; i < values.length; i++) {
      let ts: string = values[i];
      if (step_result.includes(ts)) {
        this.statecoin.setSwapError({
          msg: step_result.message,
          error: true
        })
        clear = false
        break
      }
    }
    if (clear) {
      this.statecoin.clearSwapError()
    }
    await delay_s(SWAP_TIMEOUT.RETRY_DELAY)
  }

  incrementRetries = (step_result: SwapStepResult) => {
    let statecoin = this.statecoin
    //Limit retries if errors are being returned while waiting for swap
    if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) {
      if (step_result.includes("Waiting for swap to begin")) {
        this.n_retries = 1
      } else {
        this.n_retries = this.n_retries + 1
      }
      return
    }
    switch (statecoin.swap_status) {
      //Allow unlimited network errors in phase 4
      case SWAP_STATUS.Phase4: {
        if (!(step_result.message.includes('Network') ||
          step_result.message.includes('network') ||
          step_result.message.includes('net::ERR'))) {
          this.n_retries = this.n_retries + 1
        }
        return
      }
      default: {
        this.n_retries = this.n_retries + 1
        return
      }
    }
  }

  incrementStep = () => {
    this.next_step = this.next_step + 1
  }

  checkNRetries = () => {
    if (this.statecoin.swap_status !== SWAP_STATUS.Phase4 &&
      this.n_retries >= SWAP_RETRY.MAX_REPS_PER_STEP) {
      throw new Error(`Number of tries exceeded in phase ${this.statecoin.swap_status}`)
    }
  }

  checkStepTimer = () => {
    if (this.statecoin.swap_status !== SWAP_STATUS.Phase4 &&
      this.statecoin.swap_status !== SWAP_STATUS.Phase0 &&
      this.step_timer.seconds_elapsed() >= SWAP_TIMEOUT.STEP_TIMEOUT_S) {
      throw new Error(`Timer exceeded in phase ${this.statecoin.swap_status}`)
    }
  }

  checkSwapLoopStatus = () => {
    let statecoin = this.statecoin
    if (statecoin.status === STATECOIN_STATUS.AVAILABLE) {
      throw new Error("Coin removed from swap pool")
    }
  }

  resetCounters = () => {
    this.resetRetryCounters()
    this.next_step = this.get_next_step_from_swap_status()
  }

  resetRetryCounters = () => {
    this.swap0_count = 0
    this.n_retries = 0
    this.step_timer.reset()
  }

  get_next_step_from_swap_status = () => {
    let status = this.statecoin.swap_status
    for (let i = 0; i < this.swap_steps.length; i++) {
      let step = this.swap_steps[i]
      if (step.phase === status) {
        return i
      }
    }
    // Reset to initial step by default
    return 0
  }

  checkProofKeyDer = (): SwapStepResult => {
    try {
      typeforce(typeforce.compile(typeforce.Buffer), this.proof_key_der?.publicKey);
      typeforce(typeforce.compile(typeforce.Function), this.proof_key_der?.sign);
    } catch (err) {
      throw new Error(`checkProofKeyDer: proof_key_der type error: ${err}`)
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
      await swapRegisterUtxo(this.clients.http_client, registerUtxo);
    } catch (err: any) {
      return SwapStepResult.Retry(err.message)
    }

    log.info("Coin registered for Swap. Coin ID: ", this.statecoin.shared_key_id)

    this.statecoin.swap_status = SWAP_STATUS.Phase0;
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase0;
    return SwapStepResult.Ok()
  }


  pollUtxoPhase0 = async (): Promise<SwapStepResult> => {
    try {
      let swap_id = await pollUtxo(this.clients.http_client,
        { id: this.statecoin.statechain_id });
      if (swap_id.id !== null) {
        this.updateStateCoinToPhase1(swap_id)
        return SwapStepResult.Ok()
      } else {
        return SwapStepResult.Retry("Waiting for swap to begin...")
      }
    } catch (err: any) {
      return this.handlePollUtxoPhase0Err(err)
    }
  }

  handlePollUtxoPhase0Err = (err: any): SwapStepResult => {
    if (err?.message && err.message.includes(
      "statechain timed out or has not been requested"
    )) {
      throw Error("coin removed from swap pool")
    }
    return SwapStepResult.Retry(err.message)
  }

  updateStateCoinToPhase1 = (swap_id: any) => {
    let statecoin = this.statecoin
    statecoin.swap_id = swap_id
    statecoin.setInSwap()
    statecoin.swap_status = SWAP_STATUS.Phase1;
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase1;
  }

  // Poll Conductor awaiting swap info. When it is available carry out phase1 tasks:
  // Return an SCE-Address and produce a signature over the swap_token with the
  //  proof key that currently owns the state chain they are transferring in the swap.
  pollUtxoPhase1 = async (): Promise<SwapStepResult> => {
    //Check swap id again to confirm that the coin is still awaiting swap
    //according to the server
    let swap_id;
    try {
      swap_id = await pollUtxo(this.clients.http_client, { id: this.statecoin.statechain_id });
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
    if (swap_id === null || swap_id === undefined) {
      throw new Error("expected SwapID, got null or undefined")
    }
    return swap_id
  }

  getStatecoinOut(): StateCoin {
    const statecoin_out = this.statecoin_out
    if (statecoin_out === null || statecoin_out === undefined) {
      throw new Error("expected StateCoin, got null or undefined")
    }
    return statecoin_out
  }

  getBlindedSpendSignature(): BlindedSpendSignature {
    const bss = this.blinded_spend_signature
    if (bss === null || bss === undefined) {
      throw new Error("expected BlindedSpendSignature, got null or undefined")
    }
    return bss
  }
  getBSTRequestorData(): BSTRequestorData {
    const data = this.statecoin.swap_my_bst_data
    if (data === null || data === undefined) {
      throw new Error("expected BSTRequestorData, got null or undefined")
    }
    return data
  }

  loadSwapInfo = async (): Promise<SwapStepResult> => {
    try {
      let swap_info = await getSwapInfo(this.clients.http_client, this.getSwapID());
      if (swap_info === null) {
        return SwapStepResult.Retry("awaiting swap info...")
      }
      typeforce(types.SwapInfo, swap_info);
      this.statecoin.swap_info = swap_info;
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
        this.clients.http_client,
        await this.wallet.getWasm(),
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
    let phase = null
    try {
      phase = await pollSwap(this.clients.http_client, this.getSwapID());
    } catch (err: any) {
      return SwapStepResult.Retry(err.message)
    }
    if (phase === SWAP_STATUS.Phase1) {
      return SwapStepResult.Retry("awaiting server phase 2...")
    } else if (phase === null) {
      throw new Error("Swap halted at phase 1");
    } else if (phase !== SWAP_STATUS.Phase2) {
      throw new Error("Swap error: Expected swap phase1 or phase2. Received: " + phase);
    }
    return SwapStepResult.Ok(`Swap Phase2: Coin ${this.statecoin.shared_key_id} + " in Swap ", ${this.statecoin.swap_id}`)
  }

  getBSS = async (): Promise<SwapStepResult> => {
    let bss
    try {
      bss = await get_blinded_spend_signature(this.clients.http_client, this.getSwapID().id, this.statecoin.statechain_id);
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase3;
      this.blinded_spend_signature = bss
      return SwapStepResult.Ok('got blinded spend signature')
    } catch (err: any) {
      return SwapStepResult.Retry(err.message)
    }
  }

  doSwapSecondMessage = async (): Promise<SwapStepResult> => {
    //Get the newid semaphore
    await newid_semaphore.wait()
    //Acquire all the http_client semaphores
    let count = 0
    while (count < MAX_SEMAPHORE_COUNT - 1) {
      await semaphore.wait()
      count = count + 1
    }
    try {
      await this.clients.http_client.new_tor_id();
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4;
    } catch (err: any) {
      semaphore.release(count)
      newid_semaphore.release()
      return SwapStepResult.Retry(`Error getting new TOR id: ${err}`)
    }
    try {
      let receiver_addr = await second_message(this.clients.http_client, await this.wallet.getWasm(), this.getSwapID().id,
        this.getBSTRequestorData(), this.getBlindedSpendSignature());
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5;
      // Update coin with receiver_addr and update status
      this.statecoin.swap_receiver_addr = receiver_addr;
      this.statecoin.swap_status = SWAP_STATUS.Phase3;
      return SwapStepResult.Ok(`got receiver address`);
    } catch (err: any) {
      return SwapStepResult.Retry(err.message)
    } finally {
      semaphore.release(count)
      newid_semaphore.release()
    }
  }

  pollSwapPhase3 = async (): Promise<SwapStepResult> => {
    let phase
    try {
      phase = await pollSwap(this.clients.http_client, this.getSwapID());
    } catch (err: any) {
      return SwapStepResult.Retry(err.message)
    }
    return this.checkServerPhase4(phase)
  }


  checkServerPhase4 = (phase: string): SwapStepResult => {
    if (phase === SWAP_STATUS.Phase4) {
      return SwapStepResult.Ok("server in phase 4")
    } else if (phase == null) {
      throw new Error("Swap halted at phase 3");
    }
    return SwapStepResult.Retry("awaiting server phase 4")
  }

  getSwapReceiverAddr(): SCEAddress {
    const addr = this.statecoin?.swap_receiver_addr
    if (addr === null || addr === undefined) {
      throw new Error("expected SCEAddress, got null or undefined")
    }
    return addr
  }

  transferSender = async (): Promise<SwapStepResult> => {
    try {
      // if this part has not yet been called, call it.
      this.statecoin.swap_transfer_msg = await transferSender(this.clients.http_client,
        await this.wallet.getWasm(), this.network, this.statecoin, this.proof_key_der,
        this.getSwapReceiverAddr().proof_key, true, this.wallet);
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase6;
      await this.wallet.saveStateCoinsList()
      return SwapStepResult.Ok("transfer sender complete")
    } catch (err: any) {
      return SwapStepResult.Retry(`transferSender: ${err.message}`)
    }
  }

  getTransferMsg(): TransferMsg3 {
    const tm3 = this.statecoin.swap_transfer_msg
    if (tm3 === null || tm3 === undefined) {
      throw new Error("expected SwapInfo, got null or undefined")
    }
    return tm3
  }

  transferUpdateMsg = async (): Promise<SwapStepResult> => {
    try {
      const tm3 = this.getTransferMsg()
      await transferUpdateMsg(this.clients.http_client,
        tm3, true)        
      return SwapStepResult.Ok("transfer update msg complete")
    } catch (err: any) {
      return SwapStepResult.Retry(`transferUpdateMsg: ${err.message}`)
    }
  }

  makeSwapCommitment = async (): Promise<SwapStepResult> => {
    this.statecoin.swap_batch_data = await this.make_swap_commitment();
    this.statecoin.swap_status = SWAP_STATUS.Phase4;
    await this.wallet.saveStateCoinsList()
    return SwapStepResult.Ok("made swap commitment")
  }

  getSwapInfo(): SwapInfo {
    const swap_info = this.statecoin.swap_info
    if (swap_info === null || swap_info === undefined) {
      throw new Error("expected SwapInfo, got null or undefined")
    }
    return swap_info
  }

  make_swap_commitment = async (): Promise<BatchData> => {
    let statecoin = this.statecoin
    let swap_info = this.getSwapInfo()
    let wasm_client = await this.wallet.getWasm()

    let commitment_str: string = statecoin.statechain_id;
    swap_info.swap_token.statechain_ids.forEach(function (item: string) {
      commitment_str.concat(item);
    });
    let batch_data_json: string = wasm_client.Commitment.make_commitment(commitment_str);

    let batch_data: BatchData = JSON.parse(batch_data_json);
    typeforce(types.BatchData, batch_data);
    return batch_data;
  }

  getSwapBatchTransferData(): BatchData {
    const batch_data = this.statecoin.swap_batch_data
    if (batch_data === null || batch_data === undefined) {
      throw new Error("expected SCEAddress, got null or undefined")
    }
    return batch_data
  }

  is_statechain_id_in_swap = (id: string): boolean => {
    return (this.getSwapInfo().swap_token.statechain_ids.indexOf(id) >= 0)
  }

  getTransferMsg3 = async (): Promise<SwapStepResult> => {
    if (this.statecoin.swap_transfer_msg_3_receiver !== null && this.statecoin.swap_transfer_msg_3_receiver !== undefined) {
      return SwapStepResult.Ok("transfer_msg_3_receiver already retrieved")
    }
    let http_client = this.clients.http_client
    let rec_se_addr_bip32 = this.new_proof_key_der
    let msg3s;
    msg3s = await http_client.get(GET_ROUTE.TRANSFER_GET_MSG_ADDR, rec_se_addr_bip32.publicKey.toString("hex"));
    typeforce([types.TransferMsg3], msg3s);
    const isInSwap = (msg: TransferMsg3): boolean => {
      return (this.getSwapInfo().swap_token.statechain_ids.indexOf(msg.statechain_id) >= 0)
    }
    const result = msg3s.filter(isInSwap)
    if (result.length > 1) {
      throw Error(`Error - ${result.length} transfer messages are available for statechain_id ${result[0].statechain_id}. Exiting swap...`)
    }
    if (result.length === 1) {
      this.statecoin.swap_transfer_msg_3_receiver = result[0]
      await this.wallet.saveStateCoinsList()
      return SwapStepResult.Ok("retrieved transfer_msg_3_receiver")
    }
    if (this.statecoin.swap_status === SWAP_STATUS.Phase4) {
      throw Error("Transfer message 3 not found in phase 4 - Exiting swap...")
    } else {
      return SwapStepResult.Retry("Transfer message 3 not found - retrying...")
    }
  }

  do_get_transfer_msg_4 = async (): Promise<TransferMsg4> => {
    let http_client = this.clients.http_client
    let electrum_client = this.clients.electrum_client
    let network = this.network
    let rec_se_addr_bip32 = this.new_proof_key_der
    let req_confirmations = this.req_confirmations
    let block_height = this.block_height
    let value = this.statecoin.value


    const msg3 = this.statecoin.swap_transfer_msg_3_receiver
    if (!msg3) {
      throw Error("transfer_msg_3 is null or undefined")
    }

    let batch_data = {
      "id": this.getSwapID().id,
      "commitment": this.getSwapBatchTransferData().commitment,
    }

    let transfer_msg_4 = await getTransferMsg4(http_client,
      electrum_client, network, msg3, rec_se_addr_bip32,
      batch_data, req_confirmations, block_height, value, null);
    typeforce(types.TransferMsg4, transfer_msg_4);
    return transfer_msg_4;
  }

  do_transfer_receiver = async (): Promise<TransferFinalizeData> => {
    let http_client = this.clients.http_client
    let electrum_client = this.clients.electrum_client
    let network = this.network
    let rec_se_addr_bip32 = this.new_proof_key_der
    let req_confirmations = this.req_confirmations
    let block_height = this.block_height
    let value = this.statecoin.value
    const transfer_msg_4 = await this.getTransferMsg4()

    const msg3 = this.statecoin.swap_transfer_msg_3_receiver
    if (!msg3) {
      throw Error("transfer_msg_3 is null or undefined")
    }

    let batch_data = {
      "id": this.getSwapID().id,
      "commitment": this.getSwapBatchTransferData().commitment,
    }
    let finalize_data = await transferReceiver(http_client,
      electrum_client, network, msg3, rec_se_addr_bip32,
      batch_data, req_confirmations, block_height, value, transfer_msg_4);
    typeforce(types.TransferFinalizeData, finalize_data);
    return finalize_data;
  }


  updateBlockHeight = async () => {
    if (this.clients.electrum_client instanceof EPSClient) {
      let header = await this.clients.electrum_client.latestBlockHeader();
      this.block_height = header.block_height;
    } else {
      this.block_height = null
    }
  }

  transferReceiver = async (): Promise<SwapStepResult> => {
    try {
      this.updateBlockHeight();
      await this.getTransferFinalizedData();
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase7;
      return SwapStepResult.Ok("transferReceiver")
    } catch (err: any) {
      if (err?.message) {
        if (err.message.includes("DB Error: No data for identifier.")) {
          log.debug(`Statecoin ${this.statecoin.shared_key_id} - waiting for others to complete...`)
        } else if (err.message.includes("Transfer not made to this wallet")) {
          err.message = `${err.message} - Exiting swap...`
          throw err
        } else {
          log.debug(`transferReceiver error: ${err}`)
        }
      }
      let result = await this.swapPhase4HandleErrPollSwap()
      if (!result.is_ok()) {
        return result
      } else {
        if (err?.message && (err.message.includes("wasm_client") ||
          err.message.includes(POST_ROUTE.KEYGEN_SECOND))) {
          return SwapStepResult.Retry(err.message)
        }
        let phase = result.message
        log.debug(`checking batch status - phase: ${phase}`)
        result = await this.checkBatchStatus(phase, err.message)
        result.message = `transferReceiver: ${err.message} - batch transfer status: ${result.message}`
        return result
      }
    }
  }

  // Poll swap until phase changes to Phase End. In that case complete swap by performing transfer finalize.
  swapPhase4PollSwap = async () => {
    try {
      let phase = await pollSwap(this.clients.http_client, this.getSwapID());
      return this.swapPhase4CheckPhase(phase)
    } catch (err: any) {
      if (!err.message.includes("No data for identifier")) {
        return SwapStepResult.Retry(err.message)
      } else {
        throw err
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

  async getTransferFinalizedData(): Promise<TransferFinalizeData> {
    let data = this.statecoin.swap_transfer_finalized_data
    if (data === null || data === undefined) {
      data = await this.do_transfer_receiver()
      this.statecoin.swap_transfer_finalized_data = data
      await this.wallet.saveStateCoinsList()
    }
    return data
  }

  async getTransferMsg4(): Promise<TransferMsg4> {
    let data = this.statecoin.swap_transfer_msg_4
    if (data === null || data === undefined) {
      data = await this.do_get_transfer_msg_4()
      this.statecoin.swap_transfer_msg_4 = data
      await this.wallet.saveStateCoinsList()
    }
    return data
  }
  setStatecoinOut = async (statecoin_out: StateCoin) => {
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
      await this.wallet.saveStateCoinsList();
      log.info("Swap complete for Coin: " + this.statecoin.shared_key_id + ". New statechain_id: " + statecoin_out.shared_key_id);
    } else {
      log.info("Error on swap complete for coin: " + this.statecoin.shared_key_id + " statechain_id: " + statecoin_out.shared_key_id + "Coin duplicate");
    }
  }

  swapPhase4HandleErrPollSwap = async (): Promise<SwapStepResult> => {
    try {
      let phase = await pollSwap(this.clients.http_client, this.getSwapID());
      return SwapStepResult.Ok(phase)
    } catch (err: any) {
      return SwapStepResult.Retry(err?.message)
    }
  }

  handleTimeoutError = (err: any) => {
    if (err.message.includes('Transfer batch ended. Timeout')) {
      let error = new Error(`swap id: ${this.getSwapID().id}, shared key id: ${this.statecoin.shared_key_id} - swap failed at phase 4/4 
    due to Error: ${err.message}`);
      throw error
    }
  }

  checkBatchStatus = async (phase: string | null, err_msg: string): Promise<SwapStepResult> => {
    let batch_status = null
    try {
      if (phase === null) {
        batch_status = await getTransferBatchStatus(this.clients.http_client, this.getSwapID().id);
      }
    } catch (err: any) {
      this.handleTimeoutError(err)
      return SwapStepResult.Retry(err.message)
    }
    if (batch_status?.finalized === true) {
      return SwapStepResult.Retry(`${err_msg}: statecoin ${this.statecoin.shared_key_id} - batch transfer complete for swap ID ${this.getSwapID().id}`)
    } else {
      return SwapStepResult.Retry(`statecoin ${this.statecoin.shared_key_id} waiting for completion of batch transfer in swap ID ${this.getSwapID().id}`)
    }
  }

  transferReceiverFinalize = async (): Promise<SwapStepResult> => {
    // Complete transfer for swap and receive new statecoin  
    try {
      const tfd = await this.getTransferFinalizedData();
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8;
      const wasm = await this.wallet.getWasm();
      let statecoin_out = await transferReceiverFinalize(this.clients.http_client, wasm, tfd);
      await this.setStatecoinOut(statecoin_out)
      log.info(`transfer complete.`)
      return SwapStepResult.Ok("transfer complete")
    } catch (err: any) {
      if (err?.message && err.message.includes("DB Error: No data for identifier.")) {
        log.debug(`Statecoin ${this.statecoin.shared_key_id} - waiting for others to complete...`)
      } else {
        log.debug(`transferReceiverFinalize error: ${err}`)
      }
      let result = await this.swapPhase4HandleErrPollSwap()
      if (!result.is_ok()) {
        return result
      } else {
        if (err?.message && (err.message.includes("wasm_client") ||
          err.message.includes(POST_ROUTE.KEYGEN_SECOND))) {
          return SwapStepResult.Retry(err.message)
        }
        let phase = result.message
        log.debug(`checking batch status - phase: ${phase}`)
        return this.checkBatchStatus(phase, err.message)
      }
    }
  }




  // Check statecoin is eligible for entering a swap group
  validate = () => {
    if (this.resume === true) {
      this.statecoin.validateResumeSwap()
    } else {
      this.statecoin.validateSwap()
    }
  }

  prepare_statecoin = () => {
    this.validate()
    let statecoin = this.statecoin
    // Reset coin's swap data
    if (!this.resume) {
      if (statecoin) {
        statecoin.setSwapDataToNull()
        statecoin.swap_status = SWAP_STATUS.Init;
        statecoin.ui_swap_status = SWAP_STATUS.Init;
        statecoin.setAwaitingSwap();
      }
    }
  }

  do_swap_poll = async (): Promise<StateCoin | null> => {
    this.validate()
    this.prepare_statecoin()
    this.resetCounters()
    let statecoin = this.statecoin

    await this.do_swap_steps();

    if (statecoin.swap_auto && this.statecoin_out) this.statecoin_out.swap_auto = true;
    return this.statecoin_out;
  }

  do_swap_steps = async () => {
    while (this.next_step < this.swap_steps.length) {
      await this.doNext()
    }
  }

}

