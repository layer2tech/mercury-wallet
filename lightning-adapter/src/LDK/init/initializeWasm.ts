import * as ldk from "lightningdevkit";
import fs from "fs";
import path from "path";

export default async function initializeWasm() {
  let wasm_path;
  let pathNumber = 0;
  try {
    if (process.platform === "darwin") {
      pathNumber = 0;
      wasm_path = path.resolve(
        "../node_modules/lightningdevkit/liblightningjs.wasm"
      );
    } else {
      pathNumber = 1;
      wasm_path = path.resolve("../lightningdevkit/liblightningjs.wasm");
    }

    let wasm_file = await fs.promises.readFile(wasm_path);
    await ldk.initializeWasmFromBinary(wasm_file);
  } catch (e: any) {
    // if it couldn't find the wasm due to a pathing error then try another path
    try {
      if (pathNumber === 0) {
        wasm_path = path.resolve("../lightningdevkit/liblightningjs.wasm");
      } else {
        wasm_path = path.resolve(
          "../node_modules/lightningdevkit/liblightningjs.wasm"
        );
      }
      let wasm_file = await fs.promises.readFile(wasm_path);
      await ldk.initializeWasmFromBinary(wasm_file);
    } catch (e: any) {
      console.log(`[initializeWasm.ts]: InitializeWasmError: ${e}`);
      throw new Error(`[initializeWasm.ts]: InitializeWasmError: ${e}`);
    }
  }
}
