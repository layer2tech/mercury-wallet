import * as ldk from "lightningdevkit";
import * as fs from "fs";
// import YourFeeEstimator from './lib/YourFeeEstimator.ts';
import { strict as assert } from "assert";
import YourFeeEstimator from "./lib/YourFeeEstimator";



const wasm_file = fs.readFileSync(
  "node_modules/lightningdevkit/liblightningjs.wasm"
);

await ldk.initializeWasmFromBinary(wasm_file);

const fee_estimator = ldk.FeeEstimator.new_impl(new YourFeeEstimator());

console.log(fee_estimator);



