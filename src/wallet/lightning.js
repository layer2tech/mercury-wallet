import * as ldk from "lightningdevkit";
import * as fs from "fs";
import MercuryFeeEstimator from "./lightning/MercuryFeeEstimator";
import MercuryLogger from "./lightning/MercuryLogger";

console.log("initialize the wasm from fetch...");

// THIS BREAKS THE PROJECT but we need the ldk/wasm initialized  somehow
fetch("../../static/liblightningjs.wasm")
  .then((response) => {
    return response.arrayBuffer();
  })
  .then((bytes) => {
    ldk
      .initializeWasmFromBinary(bytes)
      .then(() => {
        const result = testMessageExchange();
        result
          ? console.log("TESTMESSAGEEXCHANGE WORKED!")
          : console.log("WE BROKE SOMETHING");
      })
      .catch((err) => console.error(err));
  });

export class LightningClient {
  fee_estimator;
  electrum_client;
  logger;
  tx_broadcasted;
  tx_broadcaster;

  constructor(_electrumClient) {
    this.electrum_client = _electrumClient;

    /*
    console.log(
      "Lightning received an electrum_client of which ->",
      this.electrum_client
    );

    // Step 1: fee estimator
    this.fee_estimator = ldk.FeeEstimator.new_impl(new MercuryFeeEstimator());

    // Step 2: logger
    this.logger = ldk.Logger.new_impl(new MercuryLogger());

    // Step 3: broadcast interface
    this.tx_broadcasted = new Promise((resolve, reject) => {
      this.tx_broadcaster = ldk.BroadcasterInterface.new_impl({
        // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
        broadcast_transaction(tx) {
          console.log("Tx Broadcast: " + tx);
          resolve(tx);
        },
      });
    });

    // Step 4: network graph
    var network = ldk.Network.LDKNetwork_Testnet;
    var genesisBlock = ldk.BestBlock.constructor_from_genesis(network);
    var genesis_block_hash = genesisBlock.block_hash();

    var networkGraph = ldk.NetworkGraph.of(genesis_block_hash);

    console.log("network:", network);
    console.log("genesisBlock", genesisBlock);
    console.log("genesis_block_hash", genesis_block_hash);
    */
  }

  // starts the lightning LDK
  start() {}
}
