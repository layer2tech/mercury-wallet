let bitcoin = require('bitcoinjs-lib')

import { verifySmtProof } from '../util';
import { MockHttpClient } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";



describe('2P-ECDSA', function() {
  let http_client = new MockHttpClient();

  test('KeyGen', async function() {
    // let wasm = require('client-wasm');
    let wasm = await import('client-wasm');
    // console.log("wasm: ", wasm)
    let shared_key_id = "861d2223-7d84-44f1-ba3e-4cd7dd418560"
    let secret_key = "ff2f08aab2bf90f1ce47cf2859ceb0d6453efeca232e17e4be545cb60f4d977d";
    // // let proof_key = "02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f";
    // // let value = 10;
    let protocol = "Deposit";
    //
    let [id, statecoin] = await keyGen(http_client, shared_key_id, secret_key, protocol);
    //
    console.log("statecoin: ", statecoin);
    // expect(statecoin.shared_key_id).toBe(shared_key_id);
    // expect(statecoin.value).toBe(0);
  });

})
