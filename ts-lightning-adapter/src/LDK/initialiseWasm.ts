const fs = require('fs')


async function initialiseWasm() {

  const ldk = await import('lightningdevkit');
  const wasm_file = fs.readFileSync(
    "node_modules/lightningdevkit/liblightningjs.wasm"
  );
  await ldk.initializeWasmFromBinary(wasm_file);

};

module.exports = {initialiseWasm};
// export default initialiseWasm
