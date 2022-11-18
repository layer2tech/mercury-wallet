import * as ldk from "lightningdevkit";
import * as fs from "fs";
import { strict as assert } from "assert";
const wasm_file = fs.readFileSync(
  "node_modules/lightningdevkit/liblightningjs.wasm"
);
await ldk.initializeWasmFromBinary(wasm_file);

