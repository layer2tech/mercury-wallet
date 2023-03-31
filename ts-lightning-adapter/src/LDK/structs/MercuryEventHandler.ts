import {
  Event,
  EventsProvider,
  Event_FundingGenerationReady,
  // Event_PaymentReceived,
  Event_PaymentSent,
  Event_PaymentPathFailed,
  Event_PendingHTLCsForwardable,
  Event_SpendableOutputs,
  Event_PaymentForwarded,
  Event_ChannelClosed,
  Event_OpenChannelRequest,
  Result_NoneAPIErrorZ,
  Result_NoneAPIErrorZ_OK,
  EventHandlerInterface,
  ChannelManager,
} from "lightningdevkit";

import * as bitcoin from "bitcoinjs-lib";
import {
  uint8ArrayToHexString,
  hexToUint8Array,
  validateSigFunction,
} from "../utils/utils.js";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import crypto from "crypto";

const ECPair = ECPairFactory(ecc);

class MercuryEventHandler implements EventHandlerInterface {
  channelManager: ChannelManager;
  privateKey: Buffer;
  txid: string | null;
  vout: number | null;

  constructor(_channelManager: ChannelManager) {
    this.channelManager = _channelManager;
    this.privateKey = crypto.randomBytes(32);
    this.txid = null;
    this.vout = null;
  }

  handle_event(e: any) {
    switch (true) {
      case e instanceof Event_FundingGenerationReady:
        this.handleFundingGenerationReadyEvent_Auto(e);
        break;
      // case e instanceof Event_PaymentReceived:
      //   this.handlePaymentReceivedEvent(e);
      //   break;
      case e instanceof Event_PaymentSent:
        this.handlePaymentSentEvent(e);
        break;
      case e instanceof Event_PaymentPathFailed:
        this.handlePaymentPathFailedEvent(e);
        break;
      case e instanceof Event_PendingHTLCsForwardable:
        this.handlePendingHTLCsForwardableEvent(e);
        break;
      case e instanceof Event_SpendableOutputs:
        this.handleSpendableOutputsEvent(e);
        break;
      case e instanceof Event_PaymentForwarded:
        this.handlePaymentForwardedEvent(e);
        break;
      case e instanceof Event_OpenChannelRequest:
        this.handleOpenChannelRequestEvent(e);
        break;
      case e instanceof Event_ChannelClosed:
        this.handleChannelClosedEvent(e);
        break;
      default:
        console.debug("Event not handled: ", e);
    }
  }

  setChannelManager(channelManager: ChannelManager) {
    this.channelManager = channelManager;
  }

  setInputTx(privateKey: Buffer, txid: string, vout: number) {
    this.privateKey = privateKey;
    this.vout = vout;
    this.txid = txid;
  }

  resetInputTx() {
    //this.privateKey = null;
    this.vout = null;
    this.txid = null;
  }

  handleFundingGenerationReadyEvent_Manual(
    event: Event_FundingGenerationReady
  ) {
    const {
      temporary_channel_id,
      counterparty_node_id,
      channel_value_satoshis,
      output_script,
    } = event;

    // create funding transaction
    const witness_pos = output_script.length + 58;
    const funding_tx = new Uint8Array(witness_pos + 7);
    funding_tx[0] = 2; // 4-byte tx version 2
    funding_tx[4] = 0;
    funding_tx[5] = 1; // segwit magic bytes
    funding_tx[6] = 1; // 1-byte input count 1
    // 36 bytes previous outpoint all-0s
    funding_tx[43] = 0; // 1-byte input script length 0
    funding_tx[44] = 0xff;
    funding_tx[45] = 0xff;
    funding_tx[46] = 0xff;
    funding_tx[47] = 0xff; // 4-byte nSequence
    funding_tx[48] = 1; // one output
    const channelValueBuffer = Buffer.alloc(8);
    const channelValueNumber = parseInt(channel_value_satoshis.toString(), 10);
    channelValueBuffer.writeUInt32LE(channelValueNumber, 0);
    funding_tx.set(channelValueBuffer, 49);
    funding_tx[57] = output_script.length; // 1-byte output script length
    funding_tx.set(output_script, 58);
    funding_tx[witness_pos] = 1;
    funding_tx[witness_pos + 1] = 1;
    funding_tx[witness_pos + 2] = 0xff; // one witness element of size 1 with contents 0xff
    funding_tx[witness_pos + 3] = 0;
    funding_tx[witness_pos + 4] = 0;
    funding_tx[witness_pos + 5] = 0;
    funding_tx[witness_pos + 6] = 0; // lock time 0

    console.log("funding_tx->", uint8ArrayToHexString(funding_tx));

    let fund = this.channelManager.funding_transaction_generated(
      temporary_channel_id,
      counterparty_node_id,
      funding_tx
    );
  }

  async handleFundingGenerationReadyEvent_Auto(
    event: Event_FundingGenerationReady
  ) {
    const {
      temporary_channel_id,
      counterparty_node_id,
      channel_value_satoshis,
      output_script,
    } = event;

    // validate event
    if (
      output_script.length !== 34 &&
      output_script[0] !== 0 &&
      output_script[1] !== 32
    ) {
      return;
    }

    const network = bitcoin.networks.regtest;

    if (this.privateKey === undefined) throw Error("private key is undefined");
    let electrum_wallet = ECPair.fromPrivateKey(this.privateKey, {
      network: network,
    });
    if (electrum_wallet === undefined)
      throw Error("electrum wallet is undefined");

    console.log("[MercuryEventHandler.ts]: ECPair.fromPrivateKey:", ECPair.fromPrivateKey(this.privateKey, {network: network}));

    // Create the psbt transaction
    const psbt = new bitcoin.Psbt({ network: network });
    psbt.setVersion(2);
    psbt.setLocktime(0);
    const p2wpkh = bitcoin.payments.p2wpkh({
      pubkey: electrum_wallet.publicKey,
      network: network,
    });
    if (p2wpkh.output === undefined) throw Error("p2wpkh output is undefined");

    // Hard coded values for now
    let hash =
      "ab0916b951ee9e56e7d16710e5ac5f8b25d7cc2117e5cdddca7e6554373caa40";
    let vout = 1;
    let sequence = 4294967294;
    let witnessUtxoScript = "0014400115aeada96c6a9c953b584280ab0784bb233c";

    psbt.addInput({
      // if hash is string, txid, if hash is Buffer, is reversed compared to txid
      hash: hash,
      index: vout,
      sequence: sequence,
      witnessUtxo: {
        script: p2wpkh.output,
        value: parseInt(channel_value_satoshis.toString(), 10),
      },
    });
    psbt.addOutput({
      script: Buffer.from(output_script),
      value: parseInt(channel_value_satoshis.toString(), 10),
    });
    psbt.signAllInputs(electrum_wallet);
    psbt.finalizeAllInputs();
    let funding_tx: any = psbt.extractTransaction().toBuffer();


    console.log('[MercuryEventHandler.ts]: privateKey ->', this.privateKey);
    console.log('[MercuryEventHandler.ts]: funding_tx ->', funding_tx);

    try{
      // Send the funding transaction to the channel manager
      this.channelManager.funding_transaction_generated(
        temporary_channel_id,
        counterparty_node_id,
        funding_tx
      );
    }catch(e){
      console.log('error occured in funding transaction generated method..');
    }
  }

  handlePaymentSentEvent(e: Event_PaymentSent) {
    console.log(
      `Payment with preimage '${uint8ArrayToHexString(
        e.payment_preimage
      )}' sent.`
    );
  }

  handlePaymentPathFailedEvent(e: Event_PaymentPathFailed) {
    console.log(
      `Payment with payment hash '${uint8ArrayToHexString(
        e.payment_hash
      )}' failed.`
    );
  }

  handlePendingHTLCsForwardableEvent(e: Event_PendingHTLCsForwardable) {
    this.channelManager.process_pending_htlc_forwards();
  }

  handleSpendableOutputsEvent(e: Event_SpendableOutputs) {
    // var tx = this.keyManager.spend_spendable_outputs(
    //   e.outputs,
    //   [],
    //   Hex.decode(refundAddress),
    //   feeEstimator.get_est_sat_per_1000_weight(
    //     ConfirmationTarget.LDKConfirmationTarget_HighPriority
    //   )
    // );
    // if (tx instanceof Result_TransactionNoneZ.Result_TransactionNoneZ_OK) {
    //   chainBackend.publish(tx.res);
    // }
  }

  handlePaymentForwardedEvent(event: Event_PaymentForwarded) {
    const {
      prev_channel_id, //: Uint8Array;
      next_channel_id, //: Uint8Array;
      fee_earned_msat, //: Option_u64Z;
      claim_from_onchain_tx, //: boolean;
    } = event;

    console.log("Received payment forwarded event", event);
  }

  handleOpenChannelRequestEvent(event: Event_OpenChannelRequest) {
    const {
      temporary_channel_id, // Uint8Array
      counterparty_node_id, // Uint8Array
      funding_satoshis, // bigint
      push_msat, // bigint
      channel_type, // ChannelTypeFeatures
    } = event;

    console.log("Received open channel request:", event);
  }

  handleChannelClosedEvent(event: Event_ChannelClosed) {
    console.log("Event Channel Closed!", event);
  }
}

export default MercuryEventHandler;
