import * as fs from "fs";
import * as wasm from '../../../client-wasm/pkg/client_wasm_bg';
// const fs = require('fs')
// const ldk = require('lightningdevkit');
// const wasm_file = fs.readFileSync("../../../node_modules/lightningdevkit/liblightningjs.wasm")
// ldk.initializeWasmWebFetch(wasm_file);

// console.log(ldk);
// async function startLdk () {
// }
// let ldk = import("lightningdevkit")


describe('test', ()=>{
    test('test', async ()=> {
        let client_wasm = await import("client-wasm")
    })
})