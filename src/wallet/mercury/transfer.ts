// Mercury transfer protocol. Transfer statecoins to new owner.

import { BIP32Interface, Network, TransactionBuilder, Transaction } from "bitcoinjs-lib";
import { HttpClient, MockHttpClient, POST_ROUTE, signStateChainSig, StateCoin } from ".."
import { FeeInfo, getFeeInfo, getStateChain } from "./info_api";
import { pubKeyToScriptPubKey } from "../wallet";
import { PROTOCOL, sign } from "./ecdsa";

let lodash = require('lodash');
let types = require("../types")
let typeforce = require('typeforce');

// transfer() messages:
// 0. Receiver communicates address to Sender (B2 and C2)
// 1. Sender Initialises transfer protocol with State Entity
//      a. init, authorisation, provide receivers proofkey C2
//      b. State Entity generates x1 and sends to Sender
//      c. Sender and State Entity Co-sign new back up transaction sending to Receivers
//          backup address Addr(B2)
// 2. Receiver performs transfer with State Entity
//      a. Verify state chain is updated
//      b. calculate t1=01x1
//      c. calucaulte t2 = t1*o2_inv
//      d. Send t2, O2 to state entity
//      e. Verify o2*S2 = P


export const transferSender = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  receiver_addr: string
) => {
  // Checks for spent, owned etc here
  let new_tx_backup;
  if (statecoin.tx_backup) {
    new_tx_backup = lodash.cloneDeep(statecoin.tx_backup);
  } else {
    throw ("Back up tx does not exist. Statecoin deposit is not complete.")
  }

  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);

  // Get statechain from SE and check ownership
  let statechain = await getStateChain(http_client, statecoin.state_chain_id);
  if (statechain.amoumt == 0) throw "StateChain " + statecoin.state_chain_id + " already withdrawn."
  if (statechain.chain.pop().data != statecoin.proof_key) throw "StateChain not owned by this Statecoin. Incorrect proof key."

  // Sign statecoin to signal desire to Withdraw
  let state_chain_sig = signStateChainSig(proof_key_der, "TRANSFER", receiver_addr);

  // Init transfer: Send statechain signature or batch data
  let transfer_msg1 = {
      shared_key_id: statecoin.shared_key_id,
      statechain_sig: state_chain_sig
  }
  let transfer_msg2 = await http_client.post(POST_ROUTE.TRANSFER_SENDER, transfer_msg1);
  typeforce(types.TransferMsg2, transfer_msg2);

  // wallet.decrypt(&mut transfer_msg2)?;

  // Edit backup tx with new owners proof-key address and sign
  new_tx_backup.outs[0].script = pubKeyToScriptPubKey(receiver_addr, network);
  new_tx_backup.locktime = statechain.locktime - fee_info.interval;

  // Sign new back up tx
  let signatureHash = new_tx_backup.hashForSignature(0, new_tx_backup.ins[0].script, Transaction.SIGHASH_ALL);
  let signature = await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, signatureHash.toString('hex'), PROTOCOL.TRANSFER);
  // Set witness data as signature
  let new_tx_backup_signed = new_tx_backup;
  new_tx_backup_signed.ins[0].witness = [Buffer.from(signature)];

  // ** Can remove PrepareSignTxMsg and replace with backuptx throughout client and server?
  // Create PrepareSignTxMsg to send funding tx data to receiver
  let prepare_sign_msg: PrepareSignTxMsg = {
    shared_key_id: statecoin.shared_key_id,
    protocol: "TRANSFER",
    tx: new_tx_backup_signed,
    input_addrs: [],
    input_amounts: [],
    proof_key: statecoin.proof_key,
  };

  // Get o1 priv key
  let o1 = statecoin.shared_key.private.x2;
  let o1_bn = BigInt("0x" + o1);

  let x1 = transfer_msg2.x1.secret_bytes;
  let x1_bn = BigInt("0x" + Buffer.from(x1).toString("hex"))

  // t1 = o1x1
  let t1 = o1_bn * x1_bn;
  // let t1_encryptable = FESer::from_fe(&t1);

  let transfer_msg3 = {
    shared_key_id: statecoin.shared_key_id,
    t1: t1,
    state_chain_sig: state_chain_sig,
    state_chain_id: statecoin.state_chain_id,
    tx_backup_psm: prepare_sign_msg,
    rec_addr: receiver_addr,
  };

  // //encrypt then make immutable
  // transfer_msg3.encrypt()?;
  // let transfer_msg3 = transfer_msg3;

  // Update server database with transfer message 3 so that
  // the receiver can get the message
  await http_client.post(POST_ROUTE.TRANSFER_UPDATE_MSG, transfer_msg3);

  return transfer_msg3
}




export const transferReceiver = async (_transfer_msg_3: any, _batch_data: any) => {



}



interface PrepareSignTxMsg {
    shared_key_id: string,
    protocol: string,
    tx: Transaction,
    input_addrs: string[], // keys being spent from
    input_amounts: number[],
    proof_key: string | null,
}
