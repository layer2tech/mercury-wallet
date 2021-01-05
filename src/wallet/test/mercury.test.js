import { verifySmtProof, verifyStateChainSig } from '../util';
import { Wallet, MockHttpClient, MockWasm, pubKeyTobtcAddr, pubKeyToScriptPubKey } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";
import { TransferMsg3, TransferFinalizeData } from "../mercury/transfer";
import { KEYGEN_SIGN_DATA, TRANSFER_MSG3, FINALIZE_DATA } from './test_data.js'

let bitcoin = require('bitcoinjs-lib')
let lodash = require('lodash');
const BJSON = require('buffer-json')

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

  test('TransferSender', async function() {
    let shared_key_id = wallet.statecoins.coins[0].shared_key_id;
    let rec_se_addr = wallet.statecoins.coins[0].proof_key;

    let transfer_msg3 = await wallet.transfer_sender(shared_key_id, rec_se_addr);

    // check statecoin
    let statecoin = wallet.statecoins.getCoin(shared_key_id);
    expect(statecoin.spent).toBe(true);

    // check transfer_msg data
    expect(transfer_msg3.shared_key_id).toBe(shared_key_id);
    expect(transfer_msg3.rec_addr).toBe(rec_se_addr);
    let proof_key_der = wallet.getBIP32forProofKeyPubKey(statecoin.proof_key);
    expect(verifyStateChainSig(proof_key_der, "TRANSFER", rec_se_addr, transfer_msg3.state_chain_sig)).toBe(true)

    // check new backup tx
    let psm = transfer_msg3.tx_backup_psm;
    expect(psm.tx.ins.length).toBe(1);
    expect(psm.tx.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
    expect(psm.tx.outs.length).toBe(1);
    expect(psm.tx.outs[0].value).toBeLessThan(statecoin.value);
    expect(psm.tx.locktime).toBeLessThan(statecoin.tx_backup.locktime);
    // Check backuptx sends to new proof key
    expect(
      bitcoin.address.fromOutputScript(psm.tx.outs[0].script, statecoin.network)
    ).toBe(
      pubKeyTobtcAddr(rec_se_addr)
    );
  });

  test('TransferReceiver incorrect backup receive addr', async function() {
    let transfer_msg3: TransferMsg3 = BJSON.parse(lodash.cloneDeep(TRANSFER_MSG3));

    // set backuptx receive address to wrong proof_key addr
    let wrong_proof_key = "028a9b66d0d2c6ef7ff44a103d44d4e9222b1fa2fd34cd5de29a54875c552abd42";
    transfer_msg3.tx_backup_psm.tx.outs[0].script = pubKeyToScriptPubKey(wrong_proof_key, wallet.network);

    await expect(wallet.transfer_receiver(transfer_msg3))
      .rejects
      .toThrowError("Transfer not made to this wallet.");
  });

  test('TransferReceiver', async function() {
    let transfer_msg3: TransferMsg3 = BJSON.parse(lodash.cloneDeep(TRANSFER_MSG3));

    let finalize_data = await wallet.transfer_receiver(transfer_msg3);

    expect(finalize_data.shared_key_id).not.toBe(transfer_msg3.shared_key_id);
  });

  test('TransferReceiverFinalize', async function() {
    let finalize_data: TransferFinalizeData = BJSON.parse(lodash.cloneDeep(FINALIZE_DATA));

    let statecoin = await wallet.transfer_receiver_finalize(finalize_data);

    expect(statecoin.state_chain_id).toBe(finalize_data.state_chain_id);
    expect(statecoin.value).toBe(0);
    expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
    expect(statecoin.tx_backup).not.toBe(null);
    expect(statecoin.tx_withdraw).toBe(null);
    expect(statecoin.smt_proof).not.toBe(null);
    expect(statecoin.confirmed).toBe(false);
    expect(statecoin.spent).toBe(false);
  });
})
