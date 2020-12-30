// Mercury transfer protocol. Transfer statecoins to new owner.

import { BIP32Interface, Network, TransactionBuilder } from "bitcoinjs-lib";
import { HttpClient, MockHttpClient, POST_ROUTE, signStateChain, StateCoin } from ".."
import { FeeInfo, getFeeInfo, getStateChain } from "./info_api";
import { Transaction as BTCTransaction } from "bitcoinjs-lib/types/transaction";
import { pubKeyToScriptPubKey } from "../wallet";

let lodash = require('lodash');

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
  let tx_backup_new_owner;
  if (statecoin.tx_backup) {
    tx_backup_new_owner = lodash.cloneDeep(statecoin.tx_backup);
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
  let state_chain_sig = signStateChain(proof_key_der, "TRANSFER", receiver_addr);

  // Init transfer: Send statechain signature or batch data
  let transfer_msg2 = {
      shared_key_id: statecoin.shared_key_id,
      statechain_sig: state_chain_sig
  }
  await http_client.post(POST_ROUTE.TRANSFER_SENDER, transfer_msg2);

  // wallet.decrypt(&mut transfer_msg2)?;

  // Edit backup tx with new owners proof-key address and sign
  tx_backup_new_owner.outs[0].script = pubKeyToScriptPubKey(receiver_addr, network);
  tx_backup_new_owner.locktime = statechain.locktime - fee_info.interval;

  // ** create this struct here. Can remove PrepareSignTxMsg and replace with backuptx probably?
  // create PrepareSignTxMsg to send funding tx data to receiver
  let prepare_sign_msg: PrepareSignTxMsg = {
    shared_key_id: statecoin.shared_key_id,
    protocol: "TRANSFER",
    tx: tx_backup_new_owner,
    input_addrs: [],
    input_amounts: [],
    proof_key: statecoin.proof_key,
  };

  return prepare_sign_msg
}




export const transferReceiver = async (_transfer_msg_3: any, _batch_data: any) => {



}



interface PrepareSignTxMsg {
    shared_key_id: string,
    protocol: string,
    tx: BTCTransaction,
    input_addrs: string[], // keys being spent from
    input_amounts: number[],
    proof_key: string | null,
}
