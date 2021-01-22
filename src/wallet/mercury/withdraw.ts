// Withdraw

import { BIP32Interface, Network } from "bitcoinjs-lib";
import { getFeeInfo, HttpClient, MockHttpClient, POST_ROUTE, StateCoin } from "..";
import { PrepareSignTxMsg } from "./ecdsa";
import { getSigHash, StateChainSig, txWithdrawBuild } from "../util";
import { PROTOCOL, sign } from "./ecdsa";
import { FeeInfo, getStateChain } from "./info_api";

// withdraw() messages:
// 0. request withdraw and provide withdraw tx data
// 1. Sign state chain and request withdrawal
// 2. Co-sign withdraw tx
// 3. Broadcast withdraw tx


// Withdraw coins from state entity. Returns signed withdraw transaction
export const withdraw = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  network: Network,
  statecoin: StateCoin,
  proof_key_der: BIP32Interface,
  rec_addr: string
) => {
  // Get statechain from SE and check ownership
  let statechain = await getStateChain(http_client, statecoin.statechain_id);
  if (statechain.amoumt === 0) throw "StateChain " + statecoin.statechain_id + " already withdrawn."
  if (statechain.chain.pop().data !== statecoin.proof_key) throw "StateChain not owned by this Wallet. Incorrect proof key."

  // Sign statecoin to signal desire to Withdraw
  let statechain_sig = StateChainSig.create(proof_key_der, "WITHDRAW", rec_addr);

  // Alert SE of desire to withdraw and receive authorisation if state chain signature verifies
  let withdraw_msg_1 = {
      shared_key_id: statecoin.shared_key_id,
      statechain_sig: statechain_sig
  }
  let withdraw_init = await http_client.post(POST_ROUTE.WITHDRAW_INIT, withdraw_msg_1);
  // Check for error in withdraw_init
  console.log("withdraw_init: ", withdraw_init)

  // Get state entity fee info
  let fee_info: FeeInfo = await getFeeInfo(http_client);

  let withdraw_fee = (statecoin.value * fee_info.withdraw) / 10000;

  // Construct withdraw tx
  let txb_withdraw_unsigned = txWithdrawBuild(
    network,
    statecoin.funding_txid,
    rec_addr,
    statecoin.value,
    fee_info.address,
    withdraw_fee
  );
  let tx_withdraw_unsigned = txb_withdraw_unsigned.buildIncomplete();

  // tx_withdraw_unsigned
  let pk = await statecoin.getSharedPubKey(wasm_client);
  let signatureHash = getSigHash(tx_withdraw_unsigned, 0, pk, statecoin.value, network);

  // ** Can remove PrepareSignTxMsg and replace with backuptx throughout client and server?
  // Create PrepareSignTxMsg to send funding tx data to receiver
  let prepare_sign_msg: PrepareSignTxMsg = {
    shared_key_id: statecoin.shared_key_id,
    protocol: PROTOCOL.WITHDRAW,
    tx_hex: tx_withdraw_unsigned.toHex(),
    input_addrs: [pk],
    input_amounts: [statecoin.value],
    proof_key: statecoin.proof_key,
  };

  let signature = await sign(http_client, wasm_client, statecoin.shared_key_id, statecoin.shared_key, prepare_sign_msg, signatureHash, PROTOCOL.WITHDRAW);

  // set witness data with signature
  let tx_backup_signed = tx_withdraw_unsigned;
  tx_backup_signed.ins[0].witness = [Buffer.from(signature)];

  return tx_backup_signed
}
