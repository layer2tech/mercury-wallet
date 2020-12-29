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
  wallet.jest_testing_mode = true; // Call mock wasm

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
    expect(wallet.statecoins.getCoin(statecoin.shared_key_id)).toBe(statecoin)
  });

  test('Withdraw', async function() {
    let shared_key_id = wallet.statecoins.coins[0].shared_key_id;
    let num_unspent_statecoins_before = wallet.getUnspentStatecoins().length;
    let num_statecoins_before = wallet.statecoins.length;

    let tx_withdraw = await wallet.withdraw(shared_key_id);

    // check statecoin
    let statecoin = wallet.statecoins.getCoin(shared_key_id);
    expect(statecoin.spent).toBe(true);
    expect(statecoin.tx_withdraw).toBe(tx_withdraw);

    // check wallet.statecoins
    expect(wallet.getUnspentStatecoins().length).toBe(num_unspent_statecoins_before-1);
    expect(wallet.statecoins.length).toBe(num_statecoins_before);

    // check withdraw tx
    expect(tx_withdraw.ins.length).toBe(1);
    expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
    expect(tx_withdraw.outs.length).toBe(2);
    expect(tx_withdraw.outs[0].value).toBeLessThan(value);
    expect(tx_withdraw.locktime).toBe(0);
  });
})
