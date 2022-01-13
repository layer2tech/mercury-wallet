import { ACTION, ElectrsClient, ElectrumClient, encodeSCEAddress, EPSClient, HttpClient, MockElectrumClient, MockHttpClient, StateCoin, STATECOIN_STATUS, Wallet } from "..";
import { StateChainSig } from "../util";
import { do_transfer_receiver, first_message, get_blinded_spend_signature, make_swap_commitment, second_message, StatechainID, SwapRetryError, SWAP_STATUS, UI_SWAP_STATUS } from "./swap";
import { BIP32Interface, Network } from 'bitcoinjs-lib';
import { getSwapInfo, pollSwap, pollUtxo, swapRegisterUtxo } from "./info_api";
import { delay } from "../mercury/info_api";
import { transferReceiverFinalize, transferSender } from "../mercury/transfer";
import { getTransferBatchStatus } from "../mercury/info_api";

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

// Register coin to swap pool and set to phase0
export const swapInit = async (
    http_client: HttpClient |  MockHttpClient,
    statecoin: StateCoin,
    proof_key_der: BIP32Interface,
    swap_size: number
  ) => {
    if (statecoin.swap_status!==null && statecoin.swap_status!==SWAP_STATUS.Init)
      throw Error("Coin is already involved in a swap. Swap status: "+statecoin.swap_status);
  
    let publicKey = proof_key_der.publicKey.toString('hex');
    let sc_sig = StateChainSig.create(proof_key_der, "SWAP", publicKey);
  
    let registerUtxo = {
      statechain_id: statecoin.statechain_id,
      signature: sc_sig,
      swap_size: swap_size,
      wallet_version: version.replace("v","")
    };
  
    try {
      await swapRegisterUtxo(http_client, registerUtxo);
    } catch(err: any){
      throw new SwapRetryError(err)
    }
    
    log.info("Coin registered for Swap. Coin ID: ", statecoin.shared_key_id)
  
    statecoin.swap_status=SWAP_STATUS.Phase0;
    statecoin.ui_swap_status  = UI_SWAP_STATUS.Phase0;
    
    }


// Poll Conductor awaiting for swap pool to initialise.
export const swapPhase0 = async (
    http_client: HttpClient |  MockHttpClient,
    statecoin: StateCoin,
  ) => {
    // check statecoin is still AWAITING_SWAP
    if (statecoin.status!==STATECOIN_STATUS.AWAITING_SWAP) return null;
    if (statecoin.swap_status!==SWAP_STATUS.Phase0) throw Error("Coin is not yet in this phase of the swap protocol. In phase: "+statecoin.swap_status);

    let statechain_id: StatechainID = {
        id: statecoin.statechain_id
    };

    // PollUtxo. If swap has begun store SwapId in Statecoin
    try{
        let swap_id = await pollUtxo(http_client, statechain_id);
        if (swap_id.id !== null) {
        log.info("Swap Phase0: Swap ID received: ", swap_id)
        statecoin.swap_id = swap_id
        statecoin.swap_status=SWAP_STATUS.Phase1;
        statecoin.ui_swap_status=UI_SWAP_STATUS.Phase1;
        }
    } catch(err: any) {
        throw new SwapRetryError(err)
    }
}



// Poll Conductor awaiting swap info. When it is available carry out phase1 tasks:
// Return an SCE-Address and produce a signature over the swap_token with the
//  proof key that currently owns the state chain they are transferring in the swap.
export const swapPhase1 = async (
    http_client: HttpClient |  MockHttpClient,
    wasm_client: any,
    statecoin: StateCoin,
    proof_key_der: BIP32Interface,
    new_proof_key_der: BIP32Interface,
  ) => {
    // check statecoin is still AWAITING_SWAP
    if (statecoin.status!==STATECOIN_STATUS.AWAITING_SWAP) return null;
  
    if (statecoin.swap_status!==SWAP_STATUS.Phase1) throw Error("Coin is not in this phase of the swap protocol. In phase: "+statecoin.swap_status);
    if (statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
  
    //Check swap id again to confirm that the coin is still awaiting swap
    //according to the server
    let statechain_id: StatechainID = {
      id: statecoin.statechain_id
    };
    let swap_id;
    try{
      swap_id = await pollUtxo(http_client, statechain_id);
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
      
    statecoin.swap_id = swap_id
    if (statecoin.swap_id == null || statecoin.swap_id.id == null) {
        throw new Error("In swap phase 1 - no swap ID found");
    } 
    
    let swap_info
    try{
      swap_info = await getSwapInfo(http_client, statecoin.swap_id);
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
  
    // Drop out of function if swap info not yet available
    if (swap_info === null){
      return
    }
    log.info("Swap Phase1: Swap ",statecoin.swap_id," swap info received. Setting coin to IN_SWAP.");
  
    typeforce(types.SwapInfo, swap_info);
    statecoin.swap_info=swap_info;
  
    // set coin to STATECHAIN_STATUS.IN_SWAP
    statecoin.setInSwap();
  
    let address = {
      "tx_backup_addr": null,
      "proof_key": new_proof_key_der.publicKey.toString("hex"),
    };
    typeforce(types.SCEAddress, address);
  
    let transfer_batch_sig = StateChainSig.new_transfer_batch_sig(proof_key_der,statecoin.swap_id.id,statecoin.statechain_id);
    
    try{
      let my_bst_data = await first_message(
        http_client,
        wasm_client,
        swap_info,
        statecoin.statechain_id,
        transfer_batch_sig,
        address,
        proof_key_der
      );
  
      // Update coin with address, bst data and update status
      statecoin.swap_address=address;
      statecoin.swap_my_bst_data=my_bst_data;
      statecoin.swap_status=SWAP_STATUS.Phase2;
      statecoin.ui_swap_status=UI_SWAP_STATUS.Phase2;
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
}


// Poll swap until phase changes to Phase2. In that case all participants have completed Phase1
// and swap second message can be performed.
export const swapPhase2 = async (
    http_client: HttpClient |  MockHttpClient,
    wasm_client: any,
    statecoin: StateCoin,
  ) => {
    // check statecoin is IN_SWAP
    if (statecoin.status!==STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: "+statecoin.status);
  
    if (statecoin.swap_status!==SWAP_STATUS.Phase2) throw Error("Coin is not in this phase of the swap protocol. In phase: "+statecoin.swap_status);
    if (statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
    if (statecoin.swap_my_bst_data===null) throw Error("No BST data found for coin. BST data should be set in Phase1.");
  
    // Poll swap until phase changes to Phase2.
    let phase: string
    try {
      phase = await pollSwap(http_client, statecoin.swap_id);
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
    
    // If still in previous phase return nothing.
    // If in any other than expected Phase return Error.
    if (phase === SWAP_STATUS.Phase1) {
      return
    } else if (phase == null){
      throw new Error("Swap halted at phase 1");
    } else if (phase !== SWAP_STATUS.Phase2){
      throw new Error("Swap error: Expected swap phase2. Received: "+phase);
    }
    log.info("Swap Phase2: Coin "+statecoin.shared_key_id+" in Swap ",statecoin.swap_id,".");
    
    let bss
    try {
      bss = await get_blinded_spend_signature(http_client, statecoin.swap_id.id, statecoin.statechain_id);
      statecoin.ui_swap_status=UI_SWAP_STATUS.Phase3;
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
    try {
      await http_client.new_tor_id();
      statecoin.ui_swap_status=UI_SWAP_STATUS.Phase4;
    } catch(err: any) {
      throw new SwapRetryError(err, "Error getting new TOR id: ")
    }
  
    await delay(1);

    try{
      let receiver_addr = await second_message(http_client, wasm_client, statecoin.swap_id.id, statecoin.swap_my_bst_data, bss);
      statecoin.ui_swap_status=UI_SWAP_STATUS.Phase5;
      // Update coin with receiver_addr and update status
      statecoin.swap_receiver_addr=receiver_addr;
      statecoin.swap_status=SWAP_STATUS.Phase3;  
      log.info("Swap Phase3: Coin "+statecoin.shared_key_id+" in Swap ",statecoin.swap_id,".");
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
}



// Poll swap until phase changes to Phase3/4. In that case all carry out transfer_sender
// and transfer_receiver
export const swapPhase3 = async (
    http_client: HttpClient |  MockHttpClient,
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
    if (statecoin.status!==STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: "+statecoin.status);
  
    if (statecoin.swap_status!==SWAP_STATUS.Phase3) throw Error("Coin is not in this phase of the swap protocol. In phase: "+statecoin.swap_status);
    if (statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
    if (statecoin.swap_info===null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
    if (statecoin.swap_address===null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
    if (statecoin.swap_receiver_addr===null) throw Error("No receiver address found for coin. Receiver address should be set in Phase1.");
  
    let phase
    try{
     phase = await pollSwap(http_client, statecoin.swap_id);
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
  
    // We expect Phase4 here but should be Phase3. Server must slighlty deviate from protocol specification.
  
    // If still in previous phase return nothing.
    // If in any other than expected Phase return Error.
    if (phase === SWAP_STATUS.Phase2 || phase === SWAP_STATUS.Phase3) {
      return
    }
    else if (phase == null){
      throw new Error("Swap halted at phase 3"); 
    }
    else if (phase !== SWAP_STATUS.Phase4){
      throw new Error("Swap error: swapPhase3: Expected swap phase4. Received: "+ phase);
    }
    

    try{
      // if this part has not yet been called, call it.
      if (statecoin.swap_transfer_msg===null) {
        statecoin.swap_transfer_msg = await transferSender(http_client, wasm_client, network, statecoin, proof_key_der, statecoin.swap_receiver_addr.proof_key, true, wallet);
        statecoin.ui_swap_status=UI_SWAP_STATUS.Phase6;
        wallet.saveStateCoinsList()
        await delay(1);
      }
      if (statecoin.swap_batch_data===null) {
        statecoin.swap_batch_data = make_swap_commitment(statecoin, statecoin.swap_info, wasm_client);
        wallet.saveStateCoinsList()
      }
  
      if (statecoin.swap_transfer_msg===null || statecoin.swap_batch_data===null){
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
      statecoin.ui_swap_status=UI_SWAP_STATUS.Phase7;

      if(transfer_finalized_data !== null){
        // Update coin status
        statecoin.swap_transfer_finalized_data=transfer_finalized_data;
        statecoin.swap_status=SWAP_STATUS.Phase4;
        wallet.saveStateCoinsList()
        log.info("Swap Phase4: Coin "+statecoin.shared_key_id+" in Swap ",statecoin.swap_id,".");
      }
    } catch(err: any) {
      throw new SwapRetryError(err)
    }
  }
  
  
  // Poll swap until phase changes to Phase End. In that case complete swap by performing transfer finalize.
  export const swapPhase4 = async (
    http_client: HttpClient |  MockHttpClient,
    wasm_client: any,
    statecoin: StateCoin,
    wallet: Wallet
  ) => {
    // check statecoin is IN_SWAP
    if (statecoin.status!==STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: "+statecoin.status);
    if (statecoin.swap_status!==SWAP_STATUS.Phase4) throw Error("Coin is not in this phase of the swap protocol. In phase: "+statecoin.swap_status);
    if (statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
    if (statecoin.swap_info===null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
    if (statecoin.swap_transfer_finalized_data===null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");
  
    let phase = null
    try{ 
      phase = await pollSwap(http_client, statecoin.swap_id);
    } catch(err: any) {
      let rte = new SwapRetryError(err, "Phase4 pollSwap error: ")
      if(!rte.message.includes("No data for identifier")){
        throw rte
      } 
    }
    // If still in previous phase return nothing.
  
    // If in any other than expected Phase return Error.
    if (phase === SWAP_STATUS.Phase3) {
      return null
    } else if (phase !== SWAP_STATUS.Phase4 && phase !== null) {
      throw new Error("Swap error: swapPhase4: Expected swap phase4 or null. Received: "+phase);
    }
    log.info(`Swap Phase: ${phase} - Coin ${statecoin.shared_key_id} in Swap ${statecoin.swap_id}`);
  
    // Complete transfer for swap and receive new statecoin  
    try {
      statecoin.ui_swap_status=UI_SWAP_STATUS.Phase8;
      let statecoin_out = await transferReceiverFinalize(http_client, wasm_client, statecoin.swap_transfer_finalized_data);
      // Update coin status and num swap rounds
      statecoin.ui_swap_status=UI_SWAP_STATUS.End;
      statecoin.swap_status=SWAP_STATUS.End;
      statecoin_out.swap_rounds = statecoin.swap_rounds+1;
      statecoin_out.anon_set = statecoin.anon_set+statecoin.swap_info.swap_token.statechain_ids.length;
      wallet.setIfNewCoin(statecoin_out)
      wallet.statecoins.setCoinSpent(statecoin.shared_key_id, ACTION.SWAP)
      // update in wallet
      statecoin_out.swap_status = null;
      statecoin_out.ui_swap_status = null;
      statecoin_out.swap_auto = statecoin.swap_auto
      statecoin_out.setConfirmed();
      statecoin_out.sc_address = encodeSCEAddress(statecoin_out.proof_key)
      if(wallet.statecoins.addCoin(statecoin_out)) {
        wallet.saveStateCoinsList();
        log.info("Swap complete for Coin: "+statecoin.shared_key_id+". New statechain_id: "+ statecoin_out.shared_key_id);
      } else {
        log.info("Error on swap complete for coin: "+statecoin.shared_key_id+" statechain_id: "+ statecoin_out.shared_key_id + "Coin duplicate");      
      }
      return statecoin_out;
    } catch(err: any) {
      let phase = null
      let batch_status
      try{
        try{ 
          phase = await pollSwap(http_client, statecoin.swap_id);
        } catch(err: any) {
          let rte = new SwapRetryError(err, "Phase4 pollSwap error: ")
          if(!rte.message.includes("No data for identifier")){
            throw rte
          } 
        }

        if(phase === null){
          batch_status = await getTransferBatchStatus(http_client, statecoin.swap_id.id);
        }
      } catch (err2: any){
        if (err2.message.includes('Transfer batch ended. Timeout')){
          let error = new Error(`swap id: ${statecoin.swap_id}, shared key id: ${statecoin.shared_key_id} - swap failed at phase 4/4 
          due to Error: ${err2.message}`);
          throw error
        }
      }
      if(batch_status && batch_status?.finalized !== true){
        throw new SwapRetryError(`${err}, transfer batch status - finalized: ${batch_status.finalized}`,
        "Phase4 transferFinalize error: ");
      }
      //Keep retrying - an authentication error may occur at this stage depending on the
      //server state
      throw new SwapRetryError(err, "Phase4 transferFinalize error: ")
    }
  }
  