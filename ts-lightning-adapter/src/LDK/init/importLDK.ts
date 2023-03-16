import LightningClient from "../lightning.js";
import initLDK from "./initLDK.js";

let LDKClient: LightningClient;

export async function importLDK(electrum: string = "prod") {
  console.log("Electrum: ", electrum);

  try {
    LDKClient = initLDK(electrum);
  } catch (e) {
    console.log(e);
  }
}

export function getLDKClient() {
  if (!LDKClient) {
    throw new Error("LDKClient is not instantiated.");
  }

  return LDKClient;
}
