let bitcoin = require('bitcoinjs-lib')

import { verifySmtProof } from '../util';
import { MockHttpClient, MockWasm } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";



describe('2P-ECDSA', function() {
  let http_client = new MockHttpClient();

  test('KeyGen', async function() {
    let wasm_client = new MockWasm()

    let shared_key_id = "861d2223-7d84-44f1-ba3e-4cd7dd418560"
    let secret_key = "ff2f08aab2bf90f1ce47cf2859ceb0d6453efeca232e17e4be545cb60f4d977d";
    let protocol = "Deposit";
    //
    let [id, statecoin] = await keyGen(http_client, wasm_client, shared_key_id, secret_key, protocol);
    
    console.log("statecoin: ", statecoin);
    // expect(statecoin.shared_key_id).toBe(shared_key_id);
    // expect(statecoin.value).toBe(0);
  });

})
