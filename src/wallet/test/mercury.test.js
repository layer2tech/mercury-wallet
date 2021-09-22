import { verifySmtProof, StateChainSig, proofKeyToSCEAddress, pubKeyTobtcAddr, pubKeyToScriptPubKey, decryptECIES } from '../util';
import { Wallet, StateCoin, MockHttpClient, HttpClient, MockWasm, StateCoinList, STATECOIN_STATUS } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";
import { depositConfirm } from "../mercury/deposit";
import { withdraw } from "../mercury/withdraw";
import { transferSender, transferReceiver, transferReceiverFinalize } from "../mercury/transfer";
import { TransferMsg3, TransferFinalizeData } from "../mercury/transfer";
import { MockElectrumClient } from "../mocks/mock_electrum";

import { BTC_ADDR, KEYGEN_SIGN_DATA, makeTesterStatecoin, makeTesterStatecoins, FINALIZE_DATA, FUNDING_TXID, SHARED_KEY_ID } from './test_data.js'
import * as MOCK_CLIENT from '../mocks/mock_wasm';
import * as MOCK_SERVER from '../mocks/mock_http_client'

import { BIP32Interface, BIP32,  fromBase58, fromSeed} from 'bip32';

let bitcoin = require('bitcoinjs-lib');
let cloneDeep = require('lodash.clonedeep');
const BJSON = require('buffer-json');

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
// electrum mock
let electrum_mock = new MockElectrumClient;

describe('2P-ECDSA', function() {
  test('KeyGen', async function() {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(MOCK_SERVER.KEYGEN_FIRST)
      .mockReturnValueOnce(MOCK_SERVER.KEYGEN_SECOND);
    wasm_mock.KeyGen.first_message = jest.fn(() => MOCK_CLIENT.KEYGEN_FIRST);
    wasm_mock.KeyGen.second_message = jest.fn(() => MOCK_CLIENT.KEYGEN_SECOND);
    wasm_mock.KeyGen.set_master_key = jest.fn(() => MOCK_CLIENT.KEYGEN_SET_MASTER_KEY);

    let statecoin = await keyGen(http_mock, wasm_mock, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key.private.x2, KEYGEN_SIGN_DATA.protocol);

    expect(statecoin.shared_key_id).toBe(KEYGEN_SIGN_DATA.shared_key_id);
    expect(statecoin.value).toBe(0);
    expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
    expect(statecoin.tx_backup).toBe(null);
    expect(statecoin.tx_withdraw).toBe(null);
    expect(statecoin.smt_proof).toBe(null);
    expect(statecoin.status).toBe(STATECOIN_STATUS.INITIALISED);
  });

  test('Sign', async function() {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
      .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
      .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND);
    wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
    wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

    let signature = await sign(http_mock, wasm_mock, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key, KEYGEN_SIGN_DATA, KEYGEN_SIGN_DATA.signature_hash, KEYGEN_SIGN_DATA.protocol);
    expect(typeof signature[0]).toBe('string');
    expect(typeof signature[1]).toBe('string');
  });

})


describe('StateChain Entity', function() {
  let network = bitcoin.networks.testnet;

  describe('Deposit', function() {
    test('Confirm expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)
        .mockReturnValueOnce(MOCK_SERVER.ROOT_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
        .mockReturnValueOnce(MOCK_SERVER.DEPOSIT_CONFIRM)
        .mockReturnValueOnce(MOCK_SERVER.SMT_PROOF);
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);
      wasm_mock.verify_statechain_smt = jest.fn(() => true);

      let statecoin = makeTesterStatecoin();
      let statecoin_finalized = await depositConfirm(http_mock,wasm_mock,network,statecoin,10);

      expect(statecoin_finalized.statechain_id.length).toBeGreaterThan(0);
      expect(statecoin_finalized.proof_key.length).toBeGreaterThan(0);
      expect(statecoin_finalized.funding_txid.length).toBeGreaterThan(0);
      expect(statecoin_finalized.smt_proof).not.toBeNull();
    });
    test('Fee too large for amount.', async function() {
      let fee_info = cloneDeep(MOCK_SERVER.FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(fee_info)

      let statecoin = makeTesterStatecoin();
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
    test('Proof key not valid.', async function() {
        http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)

      let statecoin = makeTesterStatecoin();
      statecoin.proof_key = "a";
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Expected property \"pubkey\" of type ?isPoint, got Buffer");
    });
    test('Proof key not owned by wallet.', async function() {
        http_mock.get = jest.fn().mockReset()
          .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)

      let statecoin = makeTesterStatecoin();
      statecoin.proof_key = "aaaaaaaad651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e";
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Expected property \"pubkey\" of type ?isPoint, got Buffer");
    });
  });

  describe('Withdraw', function() {
    let fee_per_byte = 1;
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT
      // Sign
      http_mock.post
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
        .mockReturnValueOnce(MOCK_SERVER.WITHDRAW_CONFIRM);
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

      let tx_withdraw = await withdraw(http_mock, wasm_mock, network, [statecoin], [proof_key_der], BTC_ADDR, fee_per_byte);

      // check withdraw tx
      expect(tx_withdraw.ins.length).toBe(1);
      expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
      expect(tx_withdraw.outs.length).toBe(2);
      expect(tx_withdraw.outs[0].value).toBeLessThan(statecoin.value);
      expect(tx_withdraw.locktime).toBe(0);
    });
    test('Already withdrawn.', async function() {
      let statechain_info = cloneDeep(MOCK_SERVER.STATECHAIN_INFO);

      statechain_info.amount = 0;
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(statechain_info)

      await expect(withdraw(http_mock, wasm_mock, network, [{}], [{}], BTC_ADDR, fee_per_byte))
        .rejects
        .toThrowError("StateChain undefined already withdrawn.");
    });

    test('StateChain not owned by this wallet.', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFO))

      let statecoin = makeTesterStatecoin();
      statecoin.proof_key = "aaa";
      let statecoins = [statecoin];
      await expect(withdraw(http_mock, wasm_mock, network, statecoins, [{}], BTC_ADDR, fee_per_byte))
        .rejects
        .toThrowError("StateChain not owned by this Wallet. Incorrect proof key.");
    });
    test('Fee too large for amount.', async function() {
      let fee_info = cloneDeep(MOCK_SERVER.FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
        .mockReturnValueOnce(fee_info)
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT

      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

      await expect(withdraw(http_mock, wasm_mock, network, [statecoin], [proof_key_der], BTC_ADDR, fee_per_byte))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
  });

  describe('Withdraw Batch', function() {
    let fee_per_byte = 1
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFOS[0]))
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFOS[1]))
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT
      // Sign
      http_mock.post
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
        .mockReturnValueOnce(MOCK_SERVER.WITHDRAW_CONFIRM);
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

      let statecoins = [cloneDeep(makeTesterStatecoins()[0]), cloneDeep(makeTesterStatecoins()[1])]
      let proof_key_ders =[bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)),
        bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D))];


      let tx_withdraw = await withdraw(http_mock, wasm_mock, network, statecoins, proof_key_ders, BTC_ADDR,fee_per_byte);

      // check withdraw tx
      expect(tx_withdraw.ins.length).toBe(2);
      expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoins[0].funding_txid);
      expect(tx_withdraw.ins[1].hash.reverse().toString("hex")).toBe(statecoins[1].funding_txid);
      expect(tx_withdraw.outs.length).toBe(2);
      expect(tx_withdraw.outs[0].value).toBeLessThan(statecoins[0].value + statecoins[1].value);
      expect(tx_withdraw.locktime).toBe(0);
    });
    test('Already withdrawn.', async function() {
      let statechain_info = cloneDeep(MOCK_SERVER.STATECHAIN_INFO);
      statechain_info.amount = 0;
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(statechain_info)

      await expect(withdraw(http_mock, wasm_mock, network, [{}], [{}], BTC_ADDR))
        .rejects
        .toThrowError("StateChain undefined already withdrawn.");
    });
    test('StateChain not owned by this wallet.', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFO))

      let statecoin = cloneDeep(makeTesterStatecoins()[0]);
      statecoin.proof_key = "aaa";
      await expect(withdraw(http_mock, wasm_mock, network, [statecoin], [{}], BTC_ADDR))
        .rejects
        .toThrowError("StateChain not owned by this Wallet. Incorrect proof key.");
    });
    test('Fee too large for amount.', async function() {
      let fee_info = cloneDeep(MOCK_SERVER.FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFOS[0]))
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFOS[1]))
        .mockReturnValueOnce(fee_info)
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT

      let statecoins = cloneDeep(makeTesterStatecoins());
      let proof_key_ders = [bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)),
        bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D))];
      await expect(withdraw(http_mock, wasm_mock, network, statecoins, proof_key_ders, BTC_ADDR))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
  });

  describe('TransferSender', function() {
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.TRANSFER_SENDER)
      //Sign
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
      //POST.TRANSFER_UPDATE_MSG;
        .mockReturnValueOnce(true)
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
      let rec_se_addr = statecoin.proof_key;
      let transfer_msg3 = await transferSender(http_mock, wasm_mock, network, statecoin, proof_key_der, rec_se_addr);

      // check transfer_msg data
      expect(transfer_msg3.shared_key_id).toBe(statecoin.shared_key_id);
      expect(transfer_msg3.rec_se_addr.proof_key).toBe(rec_se_addr);

      // statechain sig verifies
      // let proof_key_der = wallet.getBIP32forProofKeyPubKey(statecoin.proof_key);
      expect(transfer_msg3.statechain_sig.verify(proof_key_der)).toBe(true)
      // t1 decryptable by proof key
      expect(decryptECIES(proof_key_der.privateKey.toString("hex"), transfer_msg3.t1.secret_bytes)).toBeTruthy()

      // check new backup tx
      let tx_backup = bitcoin.Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);
      expect(tx_backup.ins.length).toBe(1);
      expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
      expect(tx_backup.outs.length).toBe(1);
      expect(tx_backup.outs[0].value).toBeLessThan(statecoin.value);
      expect(tx_backup.locktime).toBeLessThan(statecoin.tx_backup.locktime);
      // Check backuptx sends to new proof key
      expect(
        bitcoin.address.fromOutputScript(tx_backup.outs[0].script, network)
      ).toBe(
        pubKeyTobtcAddr(rec_se_addr, network)
      );
    });
  })

  describe('TransferReceiver', function() {
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.STATECHAIN_INFO_AFTER_TRANSFER)
        .mockReturnValueOnce(cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.TRANSFER_PUBKEY)
        .mockReturnValueOnce(MOCK_SERVER.TRANSFER_RECEIVER)
      //POST.TRANSFER_UPDATE_MSG;
        .mockReturnValueOnce(true)

      let transfer_msg3 = cloneDeep(MOCK_SERVER.TRANSFER_MSG3);
      let se_rec_addr_bip32 = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER_AFTER_TRANSFER.__D));
      let finalize_data = await transferReceiver(http_mock, electrum_mock, network, transfer_msg3, se_rec_addr_bip32, null);

      expect(finalize_data.shared_key_id).not.toBe(transfer_msg3.shared_key_id);
    });
    test('Invalid StateChainSig', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.STATECHAIN_INFO_AFTER_TRANSFER)

      let transfer_msg3 = cloneDeep(MOCK_SERVER.TRANSFER_MSG3);
      transfer_msg3.statechain_sig.sig = "3044022026a22bb2b8c0e43094d9baa9de1abd1de914b59f8bbcf5b740900180da575ed10220544e27e2861edf01b5c383fc90d8b1fd41211628516789f771b2c3536e650bdb";

      await expect(transferReceiver(http_mock, electrum_mock, network, transfer_msg3, {}, null))
        .rejects
        .toThrowError("Invalid StateChainSig.");
    });
    test('Incorrect decryption key', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.STATECHAIN_INFO_AFTER_TRANSFER)

      let transfer_msg3 = cloneDeep(MOCK_SERVER.TRANSFER_MSG3_2);
      let se_rec_addr_bip32 = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER_AFTER_TRANSFER.__D));
      se_rec_addr_bip32.__D = Buffer.from("0ca756f401478fb1a166d27945501d8af59ada1cb552c598509dfcb494f475b9", "hex")

      await expect(transferReceiver(http_mock, electrum_mock, network, transfer_msg3, se_rec_addr_bip32, null))
        .rejects
        .toThrowError("Unsupported state or unable to authenticate data");
    });
  });

  describe('TransferReceiverFinalize', function() {
    test('Expect complete', async function() {
      // KeyGen
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.KEYGEN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.KEYGEN_SECOND)
      // KeyGen
      wasm_mock.KeyGen.first_message = jest.fn(() => MOCK_CLIENT.KEYGEN_FIRST);
      wasm_mock.KeyGen.second_message = jest.fn(() => MOCK_CLIENT.KEYGEN_SECOND);
      wasm_mock.KeyGen.set_master_key = jest.fn(() => MOCK_CLIENT.KEYGEN_SET_MASTER_KEY);

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.ROOT_INFO)
      http_mock.post
        .mockReturnValueOnce(MOCK_SERVER.SMT_PROOF);

      let finalize_data = BJSON.parse(cloneDeep(FINALIZE_DATA));
      let statecoin = await transferReceiverFinalize(http_mock, wasm_mock, finalize_data);

      expect(statecoin.statechain_id).toBe(finalize_data.statechain_id);
      expect(statecoin.value).toBe(finalize_data.state_chain_data.amount);
      expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
      expect(statecoin.tx_backup).not.toBe(null);
      expect(statecoin.tx_withdraw).toBe(null);
      expect(statecoin.smt_proof).not.toBe(null);
      expect(statecoin.status).toBe(STATECOIN_STATUS.INITIALISED);
    });
  });
});
