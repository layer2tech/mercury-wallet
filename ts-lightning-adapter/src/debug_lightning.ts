import initialiseWasm from "./LDK/init/initialiseWasm.js";
import { getLDKClient, createLDK } from "./LDK/init/getLDK.js";
import { hexToUint8Array } from "./LDK/utils/utils.js";
import { UserConfig } from "lightningdevkit";

export async function debug_lightning() {
  await initialiseWasm();

  console.log("import LDK");
  await createLDK("dev");

  const LightningClient = getLDKClient();
  await LightningClient.start();

  let pubkeyHex =
    "0260025d6bbae33e1f012338e67ddd329d8ef84ea223b000c8908f0eee09f938f2";
  let hostname = "127.0.0.1";
  let port = 9735;

  // 0260025d6bbae33e1f012338e67ddd329d8ef84ea223b000c8908f0eee09f938f2@127.0.0.1:9735

  console.log("Connect to Peer");
  await LightningClient.connectToPeer(pubkeyHex, hostname, port);

  let pubkey = hexToUint8Array(pubkeyHex);

  // funding TXID details:
  // bcrt1qgqq3tt4d49kx48y48dvy9q9tq7ztkgeu9h652t
  // TXID: ab0916b951ee9e56e7d16710e5ac5f8b25d7cc2117e5cdddca7e6554373caa40
  // Amount inside: 1.0BTC
  /*
  LightningClient.setInputTx(
    "ab0916b951ee9e56e7d16710e5ac5f8b25d7cc2117e5cdddca7e6554373caa40",
    0
  );*/

  console.log("Connect to channel");
  if (pubkey) {
    await LightningClient.connectToChannel(pubkey, 100000, 0, 1, true);
  }
}
