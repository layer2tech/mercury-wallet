import * as wasm from "./client_wasm_bg.wasm";
import { __wbg_set_wasm } from "./client_wasm_bg.js";
__wbg_set_wasm(wasm);
export * from "./client_wasm_bg.js";
