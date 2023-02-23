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
    "022bd8cece1f8bee57833662c461ca86484fbede65e71a7e54723610608739a493";
  let hostname = "127.0.0.1";
  let port = 9936;

  console.log("Connect to Peer");
  await LightningClient.connectToPeer(pubkeyHex, hostname, port);

  let pubkey = hexToUint8Array(pubkeyHex);

  console.log("Connect to channel");
  if (pubkey) {
    await LightningClient.connectToChannel(pubkey, 100000, 0, 1, true);
  }
}
