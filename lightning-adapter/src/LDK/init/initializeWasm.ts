import * as ldk from "lightningdevkit";
import fs from "fs";
import path from "path";

export default async function initializeWasm() {
  try {
    let wasm_path;
    if (process.platform === "darwin") {
      wasm_path = path.resolve(
        "../node_modules/lightningdevkit/liblightningjs.wasm"
      );
    } else {
      wasm_path = path.resolve("../lightningdevkit/liblightningjs.wasm");
    }

    let wasm_file = await fs.promises.readFile(wasm_path);

    await ldk.initializeWasmFromBinary(wasm_file);
  } catch (e) {
    throw new Error(`[initialiseWasm.ts]: InitialiseWasmError: ${e}`);
  }
}
