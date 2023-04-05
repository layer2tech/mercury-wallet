import initialiseWasm from "./LDK/init/initialiseWasm.js";
import { getLDKClient, createLDK } from "./LDK/init/getLDK.js";
import { hexToUint8Array } from "./LDK/utils/utils.js";
import { UserConfig } from "lightningdevkit";

export async function debug_lightning() {
  await initialiseWasm();

  console.log("import LDK");
  await createLDK("dev");

  const LightningClient = await getLDKClient();
  await LightningClient.start();

  let blockHeight = await LightningClient.getBlockHeight();
  console.log('blockHeight:', blockHeight);

  let bestBlockHash = await LightningClient.getBestBlockHash();
  console.log('bestBlockHash:', bestBlockHash);


  // Polar node details
  let pubkeyHex =
    "0249fc538d01c9ee6dd705ce3de0fa160621083a96b9edce08dee379b1b777d008";
  let hostname = "127.0.0.1";
  let port = 9936;

  // Connect to the peer node
  console.log("Connect to Peer");
  await LightningClient.connectToPeer(pubkeyHex, hostname, port);



  // Set the TXID for the funding generation event
  // funding TXID details:
  // bcrt1qgqq3tt4d49kx48y48dvy9q9tq7ztkgeu9h652t
  // TXID: 475c03424f7eb06131c437cccaa29a64fa44b04f30cca1bac88bd6ed7ff322ca
  // Amount inside: 1.0BTC
  LightningClient.setEventTXData("475c03424f7eb06131c437cccaa29a64fa44b04f30cca1bac88bd6ed7ff322ca")


  // Connect to the channel
  let pubkey = hexToUint8Array(pubkeyHex);
  //console.log("Connect to channel");
  if (pubkey) {
    //await LightningClient.connectToChannel(pubkey, 100000, 0, 1, true);
  }
}
