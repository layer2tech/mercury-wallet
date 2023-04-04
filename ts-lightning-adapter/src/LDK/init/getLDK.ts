import LightningClient from "../LightningClient.js";
import initLDK from "./initialiseLDK.js";

let LDKClient: LightningClient;

export async function createLDK(bitcoind_client: string = "prod") {
  console.log("Electrum: ", bitcoind_client);

  try {
    LDKClient = await initLDK(bitcoind_client);
  } catch (e) {
    throw Error("Couldn't init LDK");
  }
}

export function getLDKClient(): LightningClient {
  if (!LDKClient) {
    throw new Error("LDKClient is not instantiated.");
  }

  return LDKClient;
}
