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
import { uint8ArrayToHexString, hexToUint8Array } from "../utils/utils.js";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import MercuryInputManager from "./MercuryInputManager.js";

const ECPair = ECPairFactory(ecc);

class MercuryEventHandler implements EventHandlerInterface {
  channelManager: ChannelManager;

  constructor(_channelManager: ChannelManager) {
    this.channelManager = _channelManager;
  }

  handle_event(e: any) {
    console.log(">>>>>>> Handling Event here <<<<<<<", e);

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
        // this.handleChannelClosedEvent(e);
        break;
      default:
        console.debug("Event not handled: ", e);
    }
  }

  setChannelManager(channelManager: ChannelManager) {
    this.channelManager = channelManager;
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

    const testnet = bitcoin.networks.testnet;
    const electrum_wallet = ECPair.makeRandom();

    if (
      output_script.length !== 34 &&
      output_script[0] !== 0 &&
      output_script[1] !== 32
    ) {
      return;
    }

    const psbt = new bitcoin.Psbt({ network: testnet });
    psbt.setVersion(2);
    psbt.setLocktime(0);
    const p2wpkh = bitcoin.payments.p2wpkh({
      pubkey: electrum_wallet.publicKey,
      network: testnet,
    });

    const { name, m, n, address } = p2wpkh;
    console.log("address found:", address);
    console.log("name found:", name);
    console.log("m found:", m);
    console.log("n found:", n);
    console.log("electrum_wallet.publicKey", electrum_wallet.publicKey);

    if (p2wpkh.output === undefined) return;

    psbt.addInput({
      // if hash is string, txid, if hash is Buffer, is reversed compared to txid
      hash: "05e6744f3599c7b28eea5585c4791d4909314629101d15b93a83d00f49421b81",
      index: 0,
      sequence: 0xffffffff,
      witnessUtxo: {
        script: p2wpkh.output,
        value: 100000,
      },
    });
    psbt.addOutput({
      script: Buffer.from(output_script),
      value: parseInt(channel_value_satoshis.toString(), 10),
    });

    psbt.signInput(0, electrum_wallet);
    psbt.validateSignaturesOfInput(0, electrum_wallet.publicKey);
    psbt.finalizeAllInputs();

    console.log("psbt->", psbt.extractTransaction().toHex());
    console.log("base...", console.log(psbt));

    let funding_tx: any = hexToUint8Array(psbt.extractTransaction().toHex());

    console.log("funding_tx->", funding_tx);

    // Uint8Array
    let fund: any = this.channelManager.funding_transaction_generated(
      temporary_channel_id,
      counterparty_node_id,
      funding_tx
    );

    console.log("fund->", fund);
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
    console.log("Event Channel Closed!");
  }
}

export default MercuryEventHandler;
