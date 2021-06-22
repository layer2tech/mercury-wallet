// Conductor Swap protocols

import { ElectrumClient, MockElectrumClient, HttpClient, MockHttpClient, StateCoin, POST_ROUTE, GET_ROUTE, STATECOIN_STATUS } from '..';
import { transferSender, transferReceiver, TransferFinalizeData, transferReceiverFinalize, SCEAddress} from "../mercury/transfer"
import { pollUtxo, pollSwap, getSwapInfo, swapRegisterUtxo } from "./info_api";
import { getStateChain } from "../mercury/info_api";
import { StateChainSig } from "../util";
import { BIP32Interface, Network, script } from 'bitcoinjs-lib';
import { v4 as uuidv4 } from 'uuid';

let bitcoin = require("bitcoinjs-lib");

let types = require("../types")
let typeforce = require('typeforce');

// Logger import.
// Node friendly importing required for Jest tests.
declare const window: any;
let log: any;
try {
  log = window.require('electron-log');
} catch (e) {
  log = require('electron-log');
}

export const pingServer = async (
  conductor_client: HttpClient |  MockHttpClient,
) => {
  return await conductor_client.get(GET_ROUTE.PING, {})
}

function delay(s: number) {
  return new Promise( resolve => setTimeout(resolve, s*1000) );
}

// SWAP_STATUS represent each stage in the lifecycle of a coin in a swap.
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


// Register coin to swap pool and set to phase0
export const swapInit = async (
  conductor_client: HttpClient |  MockHttpClient,
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
    swap_size: swap_size
  };

  await swapRegisterUtxo(conductor_client, registerUtxo);
  log.info("Coin registered for Swap. Coin ID: ", statecoin.shared_key_id)

  statecoin.swap_status=SWAP_STATUS.Phase0;
}


// Poll Conductor awaiting for swap pool to initialise.
export const swapPhase0 = async (
  conductor_client: HttpClient |  MockHttpClient,
  statecoin: StateCoin,
) => {
  // check statecoin is still AWAITING_SWAP
  if (statecoin.status!==STATECOIN_STATUS.AWAITING_SWAP) return null;
  if (statecoin.swap_status!==SWAP_STATUS.Phase0) throw Error("Coin is not yet in this phase of the swap protocol. In phase: "+statecoin.swap_status);

  let statechain_id: StatechainID = {
    id: statecoin.statechain_id
  }

  // PollUtxo. If swap has begun store SwapId in Statecoin
  let swap_id = await pollUtxo(conductor_client, statechain_id);

  if (swap_id.id !== null) {
    log.info("Swap Phase0: Swap ID received: ", swap_id)
    statecoin.swap_id = swap_id
    statecoin.swap_status=SWAP_STATUS.Phase1;
  }
}

// Poll Conductor awaiting swap info. When it is available carry out phase1 tasks:
// Return an SCE-Address and produce a signature over the swap_token with the
//  proof key that currently owns the state chain they are transferring in the swap.
export const swapPhase1 = async (
  conductor_client: HttpClient |  MockHttpClient,
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

  let swap_info = await getSwapInfo(conductor_client, statecoin.swap_id);

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
  let my_bst_data = await first_message(
    conductor_client,
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
}


// Poll swap until phase changes to Phase2. In that case all participants have completed Phase1
// and swap second message can be performed.
export const swapPhase2 = async (
  conductor_client: HttpClient |  MockHttpClient,
  wasm_client: any,
  statecoin: StateCoin,
) => {
  // check statecoin is IN_SWAP
  if (statecoin.status!==STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: "+statecoin.status);

  if (statecoin.swap_status!==SWAP_STATUS.Phase2) throw Error("Coin is not in this phase of the swap protocol. In phase: "+statecoin.swap_status);
  if (statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
  if (statecoin.swap_my_bst_data===null) throw Error("No BST data found for coin. BST data should be set in Phase1.");

  // Poll swap until phase changes to Phase2.
  let phase: string = await pollSwap(conductor_client, statecoin.swap_id);


  await delay(1);

  // If still in previous phase return nothing.
  // If in any other than expected Phase return Error.
  if (phase === SWAP_STATUS.Phase1) {
    return
  } else if (phase !== SWAP_STATUS.Phase2){
    throw new Error("Swap error: Expected swap phase2. Received: "+phase);
  }
  log.info("Swap Phase2: Coin "+statecoin.shared_key_id+" in Swap ",statecoin.swap_id,".");


  let bss = await get_blinded_spend_signature(conductor_client, statecoin.swap_id.id, statecoin.statechain_id);
//  conductor_client.new_tor_id();  

  await delay(1);
  let receiver_addr = await second_message(conductor_client, wasm_client, statecoin.swap_id.id, statecoin.swap_my_bst_data, bss);

  // Update coin with receiver_addr and update status
  statecoin.swap_receiver_addr=receiver_addr;
  statecoin.swap_status=SWAP_STATUS.Phase3;
}


// Poll swap until phase changes to Phase3/4. In that case all carry out transfer_sender
// and transfer_receiver
export const swapPhase3 = async (
  conductor_client: HttpClient |  MockHttpClient,
  http_client: HttpClient |  MockHttpClient,
  electrum_client: ElectrumClient |  MockElectrumClient,
  wasm_client: any,
  statecoin: StateCoin,
  network: Network,
  proof_key_der: BIP32Interface,
  new_proof_key_der: BIP32Interface,
  req_confirmations: number
) => {
  // check statecoin is IN_SWAP
  if (statecoin.status!==STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: "+statecoin.status);

  if (statecoin.swap_status!==SWAP_STATUS.Phase3) throw Error("Coin is not in this phase of the swap protocol. In phase: "+statecoin.swap_status);
  if (statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
  if (statecoin.swap_info===null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
  if (statecoin.swap_address===null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
  if (statecoin.swap_receiver_addr===null) throw Error("No receiver address found for coin. Receiver address should be set in Phase1.");

  let phase = await pollSwap(conductor_client, statecoin.swap_id);

  // We expect Phase4 here but should be Phase3. Server must slighlty deviate from protocol specification.

  await delay(1);

  // If still in previous phase return nothing.
  // If in any other than expected Phase return Error.
  if (phase === SWAP_STATUS.Phase2 || phase === SWAP_STATUS.Phase3) {
    return
  } else if (phase !== SWAP_STATUS.Phase4){
    throw new Error("Swap error: swapPhase3: Expected swap phase4. Received: "+phase);
  }
  log.info("Swap Phase3: Coin "+statecoin.shared_key_id+" in Swap ",statecoin.swap_id,".");

  // if this part has not yet been called, call it.
  if (statecoin.swap_transfer_msg==null || statecoin.swap_batch_data==null) {
    statecoin.swap_transfer_msg = await transferSender(http_client, wasm_client, network, statecoin, proof_key_der, statecoin.swap_receiver_addr.proof_key);
    await delay(1)
    statecoin.swap_batch_data = make_swap_commitment(statecoin, statecoin.swap_info, wasm_client);
  }

  await delay(1);

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
    req_confirmations
  );

  await delay(1);

  // Update coin status
  statecoin.swap_transfer_finalized_data=transfer_finalized_data;
  statecoin.swap_status=SWAP_STATUS.Phase4;
}



// Poll swap until phase changes to Phase End. In that case complete swap by performing transfer finalize.
export const swapPhase4 = async (
  conductor_client: HttpClient |  MockHttpClient,
  http_client: HttpClient |  MockHttpClient,
  wasm_client: any,
  statecoin: StateCoin,
) => {
  // check statecoin is IN_SWAP
  if (statecoin.status!==STATECOIN_STATUS.IN_SWAP) throw Error("Coin status is not IN_SWAP. Status: "+statecoin.status);

  if (statecoin.swap_status!==SWAP_STATUS.Phase4) throw Error("Coin is not in this phase of the swap protocol. In phase: "+statecoin.swap_status);
  if (statecoin.swap_id===null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
  if (statecoin.swap_info===null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
  if (statecoin.swap_transfer_finalized_data===null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");

  let phase = await pollSwap(conductor_client, statecoin.swap_id);

  // If still in previous phase return nothing.
  // If in any other than expected Phase return Error.
  if (phase === SWAP_STATUS.Phase3) {
    return null
  } else if (phase !== SWAP_STATUS.Phase4 && phase !== null) {
    throw new Error("Swap error: swapPhase4: Expected swap phase4. Received: "+phase);
  }
  log.info("Swap Phase4: Coin "+statecoin.shared_key_id+" in Swap ",statecoin.swap_id,".");

  await delay(1);

  // Complete transfer for swap and receive new statecoin
  let statecoin_out = await transferReceiverFinalize(http_client, wasm_client, statecoin.swap_transfer_finalized_data);

  // Update coin status and num swap rounds
  statecoin.swap_status=SWAP_STATUS.End;
  statecoin_out.swap_rounds=statecoin.swap_rounds+1;

  return statecoin_out;
}

// Loop through swap protocol for some statecoin
export const do_swap_poll = async(
  conductor_client: HttpClient |  MockHttpClient,
  http_client: HttpClient |  MockHttpClient,
  electrum_client: ElectrumClient |  MockElectrumClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  swap_size: number,
  new_proof_key_der: BIP32Interface,
  req_confirmations: number
): Promise<StateCoin | null> => {
  if (statecoin.status===STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin "+statecoin.shared_key_id+" already in swap pool.");
  if (statecoin.status===STATECOIN_STATUS.IN_SWAP) throw Error("Coin "+statecoin.shared_key_id+" already involved in swap.");
  if (statecoin.status!==STATECOIN_STATUS.AVAILABLE) throw Error("Coin "+statecoin.shared_key_id+" not available for swap.");

  // Reset coin's swap data
  statecoin.setSwapDataToNull()

  statecoin.swap_status = SWAP_STATUS.Init;
  statecoin.setAwaitingSwap();

  let new_statecoin = null;
    while (new_statecoin==null) {
      try {
        switch (statecoin.swap_status) {
          case null: {  // Coin has been removed from swap
            return null;
          }
          case SWAP_STATUS.Init: {
            await swapInit(conductor_client, statecoin, proof_key_der, swap_size);
            break;
          }
          case SWAP_STATUS.Phase0: {
            await swapPhase0(conductor_client, statecoin);
            break;
          }
          case SWAP_STATUS.Phase1: {
            await swapPhase1(conductor_client, http_client, wasm_client, statecoin, proof_key_der, new_proof_key_der);
            break;
          }
          case SWAP_STATUS.Phase2: {
            await swapPhase2(conductor_client, wasm_client, statecoin);
            break;
          }
          case SWAP_STATUS.Phase3: {
            if (statecoin.swap_address===null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
            await swapPhase3(conductor_client, http_client, electrum_client, wasm_client, statecoin, network, proof_key_der, new_proof_key_der, req_confirmations);
            break;
          }
          case SWAP_STATUS.Phase4: {
            new_statecoin = await swapPhase4(conductor_client, http_client, wasm_client, statecoin);
          }
        }
      } catch (e) {
        // Some errors are expected to be thrown throughout, however others may be critical.
        // TODO: catch critical errors
      }
      await delay(5);
    }
  return new_statecoin;
}


export const make_swap_commitment = (statecoin: any,
  swap_info: any, wasm_client: any): BatchData => {

  let commitment_str: string = statecoin.statechain_id;
  swap_info.swap_token.statechain_ids.forEach ( function(item: string){
    commitment_str.concat(item);
  });
  let batch_data_json: string =  wasm_client.Commitment.make_commitment(commitment_str);

  let batch_data: BatchData = JSON.parse(batch_data_json);
  typeforce(types.BatchData, batch_data);
  return batch_data;
}

export const clear_statecoin_swap_info = (statecoin: StateCoin): null => {
  statecoin.swap_info=null;
  statecoin.swap_status=null;
  return null;
}

export const do_transfer_receiver = async (
  http_client: HttpClient |  MockHttpClient,
  electrum_client: ElectrumClient |  MockElectrumClient,
  network: Network,  
  batch_id: string,
  commit: string,
  statechain_ids: Array<String>,
  rec_se_addr: SCEAddress,
  rec_se_addr_bip32: BIP32Interface,
  req_confirmations: number
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
      if (msg3.rec_se_addr.proof_key===rec_se_addr.proof_key){
        let batch_data = {
          "id":batch_id,
          "commitment":commit,
        }
        await delay(1);
        let finalize_data = await transferReceiver(http_client, electrum_client, network, msg3,rec_se_addr_bip32,batch_data,req_confirmations);
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
  conductor_client: HttpClient |  MockHttpClient,
  http_client: HttpClient |  MockHttpClient,
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

  await conductor_client.post(POST_ROUTE.SWAP_FIRST, swapMsg1)

  return my_bst_data;
}

/// blind spend signature
export interface BlindedSpendSignature{
  s_prime: Secp256k1Point,
}

export const get_blinded_spend_signature = async(
  conductor_client: HttpClient |  MockHttpClient,
  swap_id: String,
  statechain_id: String,
): Promise<BlindedSpendSignature> => {
  let bstMsg = {
    "swap_id": swap_id,
    "statechain_id": statechain_id,
  };
  let result =  await conductor_client.post(POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE, bstMsg);
  typeforce(types.BlindedSpendSignature, result);
  return result;
}

export const second_message = async (
  conductor_client: HttpClient |  MockHttpClient,
  wasm_client: any,
  swap_id: String,
  my_bst_data: BSTRequestorData,
  blinded_spend_signature: BlindedSpendSignature,
): Promise<SCEAddress> => {
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
  let result =  await conductor_client.post(POST_ROUTE.SWAP_SECOND, swapMsg2);
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
  conductor_client: HttpClient |  MockHttpClient,
  swapMsg2: SwapMsg2,
) => {
  return await conductor_client.post(POST_ROUTE.SWAP_SECOND, swapMsg2)
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
export interface BSTMsg {
  swap_id: string, //Uuid,
  statechain_id: String, //Uuid,
}

export interface SwapID{
  id: string, //Option<Uuid>,
}

export interface StatechainID{
  id: string, //Option<Uuid>,
}

export interface SwapGroup{
  amount: number,
  size: number,
}
