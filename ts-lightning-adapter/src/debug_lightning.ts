import initialiseWasm from "./LDK/init/initialiseWasm.js";
import { getLDKClient, importLDK } from "./LDK/init/importLDK.js";
import { hexToUint8Array } from "./LDK/utils/utils.js";
import { UserConfig } from "lightningdevkit";

export async function debug_lightning() {
  await initialiseWasm();

  console.log("import LDK");

  await importLDK("dev");
  console.log("finisehd import LDK");

  const LightningClient = getLDKClient();

  await LightningClient.start();
  //025817585dc79c2fff719e764e30fdc28a5bda9d03e11a56b155bc4a243264d7cb@127.0.0.1:9937
  let pubkeyHex =
    "0215ba9d8131ab1b5f13a23a5cb6872887fae4226a7507af4754e7b65cf2db92fe";
  let hostname = "127.0.0.1";
  let port = 9738;

  // 0215ba9d8131ab1b5f13a23a5cb6872887fae4226a7507af4754e7b65cf2db92fe@127.0.0.1:9738

  console.log("Connect to Peer");
  await LightningClient.connectToPeer(pubkeyHex, hostname, port);

  let pubkey = hexToUint8Array(pubkeyHex);

  // set the override config so that the channel is public
  let override_config: UserConfig = UserConfig.constructor_default();
  override_config.get_channel_handshake_config().set_announced_channel(true); // public channel

  console.log("Connect to channel");
  if (pubkey) {
    await LightningClient.createChannel(pubkey, 100000, 0, override_config);
  }
}
