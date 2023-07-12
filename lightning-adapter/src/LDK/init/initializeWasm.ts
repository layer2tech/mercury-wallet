import * as ldk from "lightningdevkit";
import fs from "fs";
import path from "path";

export default async function initializeWasm() {
  try {
    let wasm_path;
    /* USE THIS FOR WINDOWS DEVELOPMENT IF BELOW DOESN'T WORK
    const args = process.argv.slice(2); // Get command line arguments
    if (args.includes("dev-windows")) {
      wasm_path = path.resolve("../lightningdevkit/liblightningjs.wasm");
    }*/

    wasm_path = path.resolve(
      "../node_modules/lightningdevkit/liblightningjs.wasm"
    );
    let wasm_file = await fs.promises.readFile(wasm_path);
    await ldk.initializeWasmFromBinary(wasm_file);
  } catch (e) {
    throw new Error(`[initializeWasm.ts]: InitializeWasmError: ${e}`);
  }
}
