import * as ldk from "lightningdevkit";
import fs from "fs";

export default async function initializeWasm(path: string) {
  try {
    let wasm_file: any;
    if (path !== "") {
      console.log("path was given to initialize wasm:");
      wasm_file = await fs.promises.readFile(path);
    } else {
      wasm_file = await fs.promises.readFile(
        "../node_modules/lightningdevkit/liblightningjs.wasm"
      );
    }

    await ldk.initializeWasmFromBinary(wasm_file);
  } catch (e) {
    throw new Error(`[initialiseWasm.ts]: InitialiseWasmError: ${e}`);
  }
}
