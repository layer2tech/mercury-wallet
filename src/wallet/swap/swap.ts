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

  constructor(){
    this.INIT_RETRY_AFTER = 600
    this.MAX_ERRS = 10
    this.MAX_ERRS_PHASE4 = 100
    this.MAX_REPS_PER_PHASE = 50
    this.MAX_REPS_PHASE4 = 100
  }
}

// Each step in the swap has an expected initial statecoin status and a function to be performed
class SwapStep {
  phaseName: string
  phase: number
  subphaseName: string
  subPhase: number
  statecoin_status: Function
  swap_status: Function
  statecoin_properties: Function
  doit: Function

  constructor( 
    phaseName: string,
    phase: number,
    subphaseName: string,
    subPhase: number,
    statecoin_status: Function,
    swap_status: Function,
    statecoin_properties: Function,
    doit: Function) {
      this.phaseName = phaseName
      this.phase = phase
      this.subphaseName = subphaseName
      this.subPhase = subPhase
      this.statecoin_status = statecoin_status
      this.swap_status = swap_status
      this.statecoin_properties = statecoin_properties
      this.doit = doit
    }

  description = () => {
    return `phase ${this.phase}:${this.phaseName}, subPhase ${this.subPhase}, ${this.subphaseName}`
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
}

class Swap {
  swap_steps: SwapStep[]
  http_client: HttpClient | MockHttpClient
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
  swap_id: any
  swap_info: any
  blinded_spend_signature: any
  swap_my_bst_data: any

  constructor(http_client: HttpClient | MockHttpClient, wasm_client: any, wallet: Wallet,
    statecoin: StateCoin, proof_key_der: BIP32Interface, new_proof_key_der: BIP32Interface) {
      this.http_client = http_client
      this.wallet = wallet
      this.proof_key_der = proof_key_der
      this.new_proof_key_der = new_proof_key_der
      this.timing_constants = new SwapTimingConstants()
      this.statecoin = statecoin
      this.network = wallet.config.network
      this.swap_size = wallet.config.min_anon_set
      this.req_confirmations = wallet.config.required_confirmations
      this.next_step = 0

      this.swap_steps = [
        new SwapStep(
          "Init", 0, "checkProofKeyDer", 0,
          () => {this.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
          () => {this.statecoin.swap_status === null || 
            this.statecoin.status === SWAP_STATUS.Init},
          () => {true},
          this.checkProofKeyDer
        ),
        new SwapStep(
          "Init", 0, "swapRegisterUtxo", 1,
          () => {this.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
          () => {this.statecoin.swap_status === null || 
            this.statecoin.status === SWAP_STATUS.Init},
          () => {true},
          this.swapRegisterUtxo
        ),
        new SwapStep(
          "Phase0", 0, "pollUtxo", 0,
          () => {this.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
          () => {this.statecoin.swap_status !== SWAP_STATUS.Phase0},
          () => {
            if (this.statecoin.statechain_id === null || 
              this.statecoin.statechain_id === undefined) throw Error("statechain id is invalid");
            return true
          },
          this.pollUtxo
        ),
        new SwapStep(
          "Phase1", 1, "pollUtxo", 0,
          () => {this.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
          () => {this.statecoin.swap_status !== SWAP_STATUS.Phase1},
          () => {
            if (this.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            return true
          },
          this.pollUtxoPhase1
        ),
        new SwapStep(
          "Phase1", 1, "getSwapInfo", 1,
          () => {this.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
          () => {this.statecoin.swap_status !== SWAP_STATUS.Phase1},
          () => {return true},
          this.getSwapInfo
        ),
        new SwapStep(
          "Phase1", 1, "getBSTData", 2,
          () => {this.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
          () => {this.statecoin.swap_status !== SWAP_STATUS.Phase1},
          () => {return true},
          this.getBSTData
        ),
        new SwapStep(
          "Phase2", 2, "pollSwapPhase2", 0,
          () => {this.statecoin.status === STATECOIN_STATUS.IN_SWAP},
          () => {this.statecoin.swap_status !== SWAP_STATUS.Phase2},
          () => {
            if (this.statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
            if (!this?.swap_my_bst_data) throw Error("No BST data found for coin. BST data should be set in Phase1.");
            if (this.statecoin.swap_info===null) throw Error("No swap info found for coin. Swap info should be set in Phase1.")
            return true
          },
          this.pollSwapPhase2
        ),
        new SwapStep(
          "Phase2", 2, "checkSwapPhase2", 1,
          () => {return true},
          () => {return true},
          () => {return true},
          this.checkSwapPhase2
        ),
        new SwapStep(
          "Phase2", 2, "getBSS", 2,
          () => {return true},
          () => {return true},
          () => {return true},
          this.getBSS
        ),
        new SwapStep(
          "Phase2", 2, "getNewTorID", 2,
          () => {return true},
          () => {return true},
          () => {return true},
          this.getNewTorID
        ),
      ]
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
        throw Error(`${step.description()}: invalid statecoin status: ${this.statecoin.swap_status}`)
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
      try {
        this.checkCurrentStatus()
        let step_result = await this.getNextStep().doit()
        log.info(`${JSON.stringify(step_result)}`)
        if(step_result.is_ok()){
          this.incrementStep()
        }
      } catch (err) {
        console.log(err)
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
      return SwapStepResult.Retry(err)
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
      this.swap_id = swap_id
      this.statecoin.swap_status = SWAP_STATUS.Phase1;
      this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase1;
      return SwapStepResult.Ok()
    } else {
      return SwapStepResult.Retry()
    }
  } catch (err: any) {
     return SwapStepResult.Retry(err)
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
    return SwapStepResult.Retry(err)
  }
  this.statecoin.swap_id = swap_id
  this.swap_id = swap_id
  if (swap_id == null || swap_id.id == null) {
    throw new Error("In swap phase 1 - no swap ID found");
  }
  return SwapStepResult.Ok()
}

getSwapInfo = async (): Promise<SwapStepResult> => {
  try {
    let swap_info = await getSwapInfo(this.http_client, this.swap_id);
    if (swap_info === null) {
      return SwapStepResult.Retry("awaiting swap info...")
    } 
    typeforce(types.SwapInfo, swap_info);
    this.statecoin.swap_info = swap_info;
    this.swap_info = swap_info
    this.statecoin.setInSwap();
    return SwapStepResult.Ok(`swap info received`)
  } catch (err: any) {
    return SwapStepResult.Retry(err)
  }
}
 
getBSTData = async (): Promise<SwapStepResult> => {
  let address = {
    "tx_backup_addr": null,
    "proof_key": this.new_proof_key_der.publicKey.toString("hex"),
  };
  typeforce(types.SCEAddress, address);

  let transfer_batch_sig = StateChainSig.new_transfer_batch_sig(this.proof_key_der, 
    this.swap_id.id, this.statecoin.statechain_id);
  try {
    let my_bst_data = await first_message(
      this.http_client,
      this.wasm_client,
      this.swap_info,
      this.statecoin.statechain_id,
      transfer_batch_sig,
      address,
      this.proof_key_der
    );

    // Update coin with address, bst data and update status
    this.statecoin.swap_address = address;
    this.statecoin.swap_my_bst_data = my_bst_data;
    this.swap_my_bst_data = my_bst_data
    this.statecoin.swap_status = SWAP_STATUS.Phase2;
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase2;
    return SwapStepResult.Ok()
  } catch (err: any) {
    return SwapStepResult.Retry(err)
  }
}

// Poll swap until phase changes to Phase2. In that case all participants have completed Phase1
// and swap second message can be performed.
pollSwapPhase2 = async (): Promise<SwapStepResult> => {
  // Poll swap until phase changes to Phase2.
  let phase: string
  try {
    phase = await pollSwap(this.http_client, this.swap_id);
  } catch (err: any) {
    return SwapStepResult.Retry(err)
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

getBSS = async (): Promise<SwapStepResult>{ 
  let bss
  try {
    bss = await get_blinded_spend_signature(this.http_client, this.swap_id.id, this.statecoin.statechain_id);
    this.statecoin.ui_swap_status=UI_SWAP_STATUS.Phase3;
    this.blinded_spend_signature  = bss
    return SwapStepResult.Ok('got blinded spend signature')
  } catch(err: any) {
    return SwapStepResult.Retry(err)
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
    let receiver_addr = await second_message(this.http_client, this.wasm_client, this.swap_id.id, 
      this.swap_my_bst_data, this.blinded_spend_signature);
    this.statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5;
    // Update coin with receiver_addr and update status
    this.statecoin.swap_receiver_addr=receiver_addr;
    this.statecoin.swap_status=SWAP_STATUS.Phase3;  
    return SwapStepResult.Ok(`got receiver address`);
  } catch(err: any) {
    return SwapStepResult.Retry(err)
  }
}



}

// Check statecoin is eligible for entering a swap group
export const checkEligibleForSwap = (statecoin: StateCoin) => {
  if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already in swap pool.");
  if (statecoin.status === STATECOIN_STATUS.IN_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " already involved in swap.");
  if (statecoin.status !== STATECOIN_STATUS.AVAILABLE) throw Error("Coin " + statecoin.getTXIdAndOut() + " not available for swap.");
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



// Register coin to swap pool and set to phase0











// Poll swap until phase changes to Phase3/4. In that case all carry out transfer_sender
// and transfer_receiver
export const swapPhase3 = async (
  http_client: HttpClient | MockHttpClient,
  electrum_client: ElectrumClient | ElectrsClient | EPSClient | MockElectrumClient,
  wasm_client: any,
  statecoin: StateCoin,
  network: Network,
  proof_key_der: BIP32Interface,
  new_proof_key_der: BIP32Interface,
  req_confirmations: number,
  block_height: number | null,
  wallet: Wallet
) => {
  // check statecoin is IN_SWAP
  if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: " + statecoin.status);

  if (statecoin.swap_status !== SWAP_STATUS.Phase3) throw Error("Coin is not in this phase of the swap protocol. In phase: " + statecoin.swap_status);
  if (statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
  if (statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
  if (statecoin.swap_address === null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
  if (statecoin.swap_receiver_addr === null) throw Error("No receiver address found for coin. Receiver address should be set in Phase1.");

  let phase
  try {
    phase = await pollSwap(http_client, statecoin.swap_id);
  } catch (err: any) {
    throw new SwapRetryError(err)
  }

  // We expect Phase4 here but should be Phase3. Server must slighlty deviate from protocol specification.

  // If still in previous phase return nothing.
  // If in any other than expected Phase return Error.
  if (phase === SWAP_STATUS.Phase2 || phase === SWAP_STATUS.Phase3) {
    return
  }
  else if (phase == null) {
    throw new Error("Swap halted at phase 3");
  }
  else if (phase !== SWAP_STATUS.Phase4) {
    throw new Error("Swap error: swapPhase3: Expected swap phase4. Received: " + phase);
  }


  try {
    // if this part has not yet been called, call it.
    if (statecoin.swap_transfer_msg === null) {
      statecoin.swap_transfer_msg = await transferSender(http_client, wasm_client, network, statecoin, proof_key_der, statecoin.swap_receiver_addr.proof_key, true, wallet);
      statecoin.ui_swap_status = UI_SWAP_STATUS.Phase6;
      wallet.saveStateCoinsList()
      await delay(1);
    }
    if (statecoin.swap_batch_data === null) {
      statecoin.swap_batch_data = make_swap_commitment(statecoin, statecoin.swap_info, wasm_client);
      wallet.saveStateCoinsList()
    }

    if (statecoin.swap_transfer_msg === null || statecoin.swap_batch_data === null) {
      console.log("do not yet have swap_transfer_msg or swap_batch_data - retrying...")
      return;
    }

    // Otherwise continue with attempt to comlete transfer_receiver
    let transfer_finalized_data = await do_transfer_receiver(
      http_client,
      electrum_client,
      network,
      statecoin.swap_id.id,
      statecoin.swap_batch_data.commitment,
      statecoin.swap_info.swap_token.statechain_ids,
      statecoin.swap_address,
      new_proof_key_der,
      req_confirmations,
      block_height,
      statecoin.value
    );
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase7;

    if (transfer_finalized_data !== null) {
      // Update coin status
      statecoin.swap_transfer_finalized_data = transfer_finalized_data;
      statecoin.swap_status = SWAP_STATUS.Phase4;
      wallet.saveStateCoinsList()
      log.info("Swap Phase4: Coin " + statecoin.shared_key_id + " in Swap ", statecoin.swap_id, ".");
    }
  } catch (err: any) {
    throw new SwapRetryError(err)
  }
}


// Poll swap until phase changes to Phase End. In that case complete swap by performing transfer finalize.
export const swapPhase4 = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  statecoin: StateCoin,
  wallet: Wallet
) => {
  // check statecoin is IN_SWAP
  if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: " + statecoin.status);
  if (statecoin.swap_status !== SWAP_STATUS.Phase4) throw Error("Coin is not in this phase of the swap protocol. In phase: " + statecoin.swap_status);
  if (statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
  if (statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
  if (statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");

  let phase = null
  try {
    phase = await pollSwap(http_client, statecoin.swap_id);
  } catch (err: any) {
    let rte = new SwapRetryError(err, "Phase4 pollSwap error: ")
    if (!rte.message.includes("No data for identifier")) {
      throw rte
    }
  }
  // If still in previous phase return nothing.

  // If in any other than expected Phase return Error.
  if (phase === SWAP_STATUS.Phase3) {
    throw new SwapRetryError("Client in swap phase 4. Server in phase 3. Awaiting phase 4. Retrying...", "")
  } else if (phase !== SWAP_STATUS.Phase4 && phase !== null) {
    throw new Error("Swap error: swapPhase4: Expected swap phase4 or null. Received: " + phase);
  }
  log.info(`Swap Phase: ${phase} - Coin ${statecoin.shared_key_id} in Swap ${statecoin.swap_id}`);

  // Complete transfer for swap and receive new statecoin  
  try {
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8;
    let statecoin_out = await transferReceiverFinalize(http_client, wasm_client, statecoin.swap_transfer_finalized_data);
    // Update coin status and num swap rounds
    statecoin.ui_swap_status = UI_SWAP_STATUS.End;
    statecoin.swap_status = SWAP_STATUS.End;
    statecoin_out.swap_rounds = statecoin.swap_rounds + 1;
    statecoin_out.anon_set = statecoin.anon_set + statecoin.swap_info.swap_token.statechain_ids.length;
    wallet.setIfNewCoin(statecoin_out)
    wallet.statecoins.setCoinSpent(statecoin.shared_key_id, ACTION.SWAP)
    // update in wallet
    statecoin_out.swap_status = null;
    statecoin_out.ui_swap_status = null;
    statecoin_out.swap_auto = statecoin.swap_auto
    statecoin_out.setConfirmed(); 
    statecoin_out.sc_address = encodeSCEAddress(statecoin_out.proof_key, wallet)
    console.log("got SCE address.")
    if (wallet.statecoins.addCoin(statecoin_out)) {
      wallet.saveStateCoinsList();
      log.info("Swap complete for Coin: " + statecoin.shared_key_id + ". New statechain_id: " + statecoin_out.shared_key_id);
    } else {
      log.info("Error on swap complete for coin: " + statecoin.shared_key_id + " statechain_id: " + statecoin_out.shared_key_id + "Coin duplicate");
    }
    return statecoin_out;
  } catch (err: any) {
    let phase = null
    let batch_status
    try {
      try {
        phase = await pollSwap(http_client, statecoin.swap_id);
      } catch (err: any) {
        let rte = new SwapRetryError(`${err}`, `Phase4 pollSwap error - swap with ID ${statecoin.swap_id.id}: `)
        if (!rte.message.includes("No data for identifier")) {
          throw rte
        }
      }
      console.log(`phase: ${phase}`)
      if (phase === null) {
        batch_status = await getTransferBatchStatus(http_client, statecoin.swap_id.id);
      }
    } catch (err2: any) {
      if (err2.message.includes('Transfer batch ended. Timeout')) {
        let error = new Error(`swap id: ${statecoin.swap_id.id}, shared key id: ${statecoin.shared_key_id} - swap failed at phase 4/4 
        due to Error: ${err2.message}`);
        throw error
      }
    }

    //Keep retrying - an authentication error may occur at this stage depending on the
    //server state
    console.log(`batch_status: ${batch_status}`)
    if((batch_status && batch_status?.finalized !== true) || 
        err.message.includes("No data for identifier")) {
      throw new SwapRetryError(
        `statecoin ${statecoin.shared_key_id} waiting for completion of batch transfer in swap ID ${statecoin.swap_id.id}`, 
        "Phase4 transferFinalize error: "
        )
    }    
    throw new SwapRetryError(err, "Phase4 transferFinalize error: ")
  }
}

// Loop through swap protocol for some statecoin
export const do_swap_poll = async (
  http_client: HttpClient | MockHttpClient,
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
  if (resume) {
    if (statecoin.status !== STATECOIN_STATUS.IN_SWAP) throw Error("Cannot resume coin " + statecoin.shared_key_id + " - not in swap.");
    if (statecoin.swap_status !== SWAP_STATUS.Phase4)
      throw Error("Cannot resume coin " + statecoin.shared_key_id + " - swap status: " + statecoin.swap_status);
  } else {
    checkEligibleForSwap(statecoin)
  }

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

  const INIT_RETRY_AFTER = 600
  const MAX_ERRS = 10
  const MAX_ERRS_PHASE4 = 100
  const MAX_REPS_PER_PHASE = 50
  const MAX_REPS_PHASE4 = 100
  let swap0_count = 0
  let n_errs = 0
  let n_reps = 0
  let new_statecoin = null
  while (new_statecoin == null) {
    try {
      if (statecoin.swap_status !== SWAP_STATUS.Phase4 && n_reps >= MAX_REPS_PER_PHASE) {
        throw new Error(`Number of tries exceeded in phase ${statecoin.swap_status}`)
      }
      if (statecoin.swap_status === SWAP_STATUS.Phase4 && n_reps >= MAX_REPS_PHASE4) {
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
          if (swap0_count < INIT_RETRY_AFTER) {
            try {
              await swapPhase0(http_client, statecoin);
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
          await swapPhase1(http_client, wasm_client, statecoin, proof_key_der, new_proof_key_der);
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
          await swapPhase3(http_client, electrum_client, wasm_client, statecoin, network, proof_key_der, new_proof_key_der, req_confirmations, block_height, wallet);
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
      } else if (err instanceof SwapRetryError && n_errs < MAX_ERRS && statecoin.swap_status !== SWAP_STATUS.Phase4) {
        n_errs = n_errs + 1
        console.log(`Error during swap: ${message} - retrying...`);
        if (message!.includes("Incompatible")) {
          alert(message)
        }
        if (message!.includes("punishment")) {
          alert(message)
        }
      }
      else if (err instanceof SwapRetryError && n_errs < MAX_ERRS_PHASE4 && statecoin.swap_status === SWAP_STATUS.Phase4) {
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
