import * as fs from "fs";
import * as ldk from 'lightningdevkit';
const wasm_file = fs.readFileSync("../../node_modules/lightningdevkit/liblightningjs.wasm")
ldk.initializeWasmFromBinary(wasm_file);

console.log(ldk);