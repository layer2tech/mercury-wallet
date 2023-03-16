import * as ldk from "lightningdevkit";
import fs from "fs";

export default async function initialiseWasm() {
  try {
    //"/Users/samgershuny/Documents/mercury-wallet/ts-lightning-adapter/node_modules/lightningdevkit/liblightningjs.wasm"
    const wasm_file = fs.readFileSync(
      "node_modules/lightningdevkit/liblightningjs.wasm"
    );
    await ldk.initializeWasmFromBinary(wasm_file);

    //ldk.pubkey
    //ldk.;

    //console.log("ldk initialized from wasm..", ldk.NodeId.constructor_from_pubkey());
    //console.log(ldk);
  } catch (e) {
    throw new Error(`InitialiseWasmError: ${e}`);
  }

  //   NodeAlias: [class NodeAlias extends CommonBase],
  // NodeAnnouncement: [class NodeAnnouncement extends CommonBase],
  // NodeAnnouncementInfo: [class NodeAnnouncementInfo extends CommonBase],
  // NodeFeatures: [class NodeFeatures extends CommonBase],
  // NodeId: [class NodeId extends CommonBase],
  // NodeInfo: [class NodeInfo extends CommonBase],
}
