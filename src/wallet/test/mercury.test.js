let bitcoin = require('bitcoinjs-lib')

import { verifySmtProof } from '../util';
import { Wallet, MockHttpClient, MockWasm } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";

import { KEYGEN_SIGN_DATA } from './test_data.js'


describe('2P-ECDSA', function() {
  let http_client = new MockHttpClient();
  let wasm_client = new MockWasm();

  test('KeyGen', async function() {
    let statecoin = await keyGen(http_client, wasm_client, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key.private.x2, KEYGEN_SIGN_DATA.protocol);
    expect(statecoin.shared_key_id).toBe(KEYGEN_SIGN_DATA.shared_key_id);
    expect(statecoin.value).toBe(0);
    expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
    expect(statecoin.tx_backup).toBe(null);
    expect(statecoin.tx_withdraw).toBe(null);
    expect(statecoin.smt_proof).toBe(null);
    expect(statecoin.confirmed).toBe(false);
    expect(statecoin.spent).toBe(false);
  });

  test('Sign', async function() {
    let signature = await sign(http_client, wasm_client, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key, KEYGEN_SIGN_DATA.signature_hash, KEYGEN_SIGN_DATA.protocol);
    expect(typeof signature).toBe('string');
  });
})


describe('StateChain Entity', function() {
  let wallet = Wallet.buildMock();
  wallet.jest_testing_mode = true;

  let value = 10000

  test('Deposit', async function() {
    let statecoin = await wallet.deposit(value)
    expect(statecoin.state_chain_id.length).toBeGreaterThan(0);
    expect(statecoin.proof_key.length).toBeGreaterThan(0);
    expect(statecoin.funding_txid.length).toBeGreaterThan(0);
    expect(statecoin.tx_backup).not.toBeNull();
    expect(statecoin.tx_withdraw).toBeNull();
    expect(statecoin.smt_proof).not.toBeNull();
    expect(statecoin.confirmed).toBe(false);
    expect(statecoin.spent).toBe(false);
  });



  // test('Withdraw', async function() {
  //
  //   let withdraw_res = await wallet.withdraw(KEYGEN_SIGN_DATA.shared_key_id);
  //   console.log("withdraw_res: ", withdraw_res);
  //
  //   // expect(typeof signature).toBe('string');
  // });
})
