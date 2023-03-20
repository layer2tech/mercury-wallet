import * as ldk from "lightningdevkit";
import fs from "fs";

export default async function initialiseWasm() {
  try {
    const wasm_file = fs.readFileSync(
      "node_modules/lightningdevkit/liblightningjs.wasm"
    );
    await ldk.initializeWasmFromBinary(wasm_file);
  } catch (e) {
    throw new Error(`InitialiseWasmError: ${e}`);
  }
}
