
import { TransactionBuilder, crypto, networks } from 'bitcoinjs-lib';
let bip32 = require('bip32');

import { signStateChain } from '../util';


describe('signStateChain', function() {
  let proof_key_der = bip32.fromSeed(Buffer.from("0123456789abcdef"), networks.bitcoin)

  test('Gen and Verify', async function() {
    console.log("proof_key_der", proof_key_der.privateKey.toString("hex"))
    let sig = signStateChain(proof_key_der, "WITHDRAW", "aaa10")
    expect(sig.toString("hex")).toBe("a28a572a4aa572a101dcd51b23f87b57e05cf45dabe69156d84afaa2833922f1008b1e7b098842645d39e4c5d1a4bfa683dfd0080b90cde2072f75ee255843a4");
  });

})
