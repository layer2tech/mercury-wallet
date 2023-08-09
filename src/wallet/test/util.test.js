/**
 * @jest-environment ./jest-environment-uint8array-27.js
 */

import { networks, ECPair } from "bitcoinjs-lib";
import { BACKUP_SEQUENCE, FEE_INFO, WITHDRAW_SEQUENCE } from '../mocks/mock_http_client';
import {
  txBackupBuild,
  txWithdrawBuild,
  txWithdrawBuildBatch,
  txCPFPBuild,
  StateChainSig,
  toSatoshi,
  fromSatoshi,
  decodeSCEAddress,
  encodeSecp256k1Point,
  decodeSecp256k1Point,
  encryptECIES,
  decryptECIES,
  encryptAES,
  decryptAES,
  proofKeyToSCEAddress,
  encodeMessage,
  decodeMessage,
  VIRTUAL_TX_SIZE,
  getTxFee,
  FEE,
  FEE_1I1O,
  getTxFeePoundDepost,
} from "../util";
import { encodeSCEAddress, txBuilder } from "../util";
import {
  FUNDING_TXID,
  FUNDING_TXIDS,
  FUNDING_VOUT,
  BTC_ADDR,
  SIGNSTATECHAIN_DATA,
  PROOF_KEY,
  SECRET_BYTES,
  BACKUP_TX_HEX,
  SHARED_KEY_ID,
  STATECHAIN_ID,
  makeTesterStatecoin,
} from "./test_data.js";
import { Wallet } from "../";

import { encrypt, decrypt, PrivateKey } from "eciesjs12b";
import { callGetArgsHasTestnet } from "../../features/WalletDataSlice";

let bip32 = require("bip32");
let bitcoin = require("bitcoinjs-lib");

let network = networks.testnet;

// Ignore and do not import webStore
jest.mock("../../application/webStore", () => jest.fn());

test("to/from Satoshi", async function () {
  let btc = 1;
  let sat = toSatoshi(1);
  expect(sat).toBe(100000000);
  expect(fromSatoshi(sat)).toBe(btc);
});

describe("signStateChain", function () {
  let proof_key_der = bip32.fromSeed(Buffer.from("0123456789abcdef"), network);

  test("Gen and Verify", async function () {
    SIGNSTATECHAIN_DATA.forEach((data) => {
      let statechain_sig = StateChainSig.create(
        proof_key_der,
        data.purpose,
        data.data
      );
      expect(statechain_sig.sig).toBe(data.sig);
      expect(statechain_sig.verify(proof_key_der)).toBe(true);
    });
  });
})

describe('txBuilder - Back Up Transaction', function() {
    let backup_receive_addr = BTC_ADDR
    let locktime = 100;


    let fee_info = FEE_INFO;
    fee_info.withdraw = 100;
    let nSequence = BACKUP_SEQUENCE;
    let statecoin = makeTesterStatecoin();
    
    let sc_infos = [{
      utxo: {txid: statecoin.funding_txid, vout: statecoin.funding_vout},
      amount: 100,
      chain: statecoin.chain,
      locktime: statecoin.init_locktime
    }];
    

  test('txBuilder - Back up transaction throw on value < fee', async function() {
    expect(() => {  // not enough value
      txBuilder(network, sc_infos, backup_receive_addr, FEE_INFO, nSequence, undefined, locktime);
    }).toThrowError('Not enough value to cover fee.');
  });

  test('Check built tx correct 1', async function() {
    // Set withdrawal statecoin to 10000
    sc_infos[0].amount = 10000;

    let tx_backup = txBuilder(network, sc_infos, backup_receive_addr, FEE_INFO, nSequence, undefined, locktime).extractTransaction();
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(sc_infos[0].utxo.txid);
    expect(tx_backup.outs.length).toBe(2);
    expect(tx_backup.outs[0].value).toBeLessThan(sc_infos[0].amount);
    expect(tx_backup.locktime).toBe(locktime);
  });

  test('Check built tx correct: no withdrawal fee', async function() {
    // Set withdrawal statecoin to 10000
    sc_infos[0].amount = 10000;

    fee_info.withdraw = 0;
    
    let tx_backup = txBuilder(network, sc_infos, backup_receive_addr, fee_info, nSequence, undefined, locktime).extractTransaction();
    
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(sc_infos[0].utxo.txid);
    expect(tx_backup.outs.length).toBe(1);
    expect(tx_backup.outs[0].value).toBeLessThan(sc_infos[0].amount);
    expect(tx_backup.locktime).toBe(locktime);
  })
});

describe("getTxFee", function () {
  let fee_per_byte = 3; // 3 sat/byte

  test("single", function () {
    expect(getTxFee(fee_per_byte)).toEqual(678);
  });

  test("single at 1 sat/byte", function () {
    expect(getTxFee(1)).toEqual(226);
  });

  test("batch 3", function () {
    expect(getTxFee(fee_per_byte, 3)).toEqual(1566);
  });

  test("batch 5", function () {
    expect(getTxFee(fee_per_byte, 5)).toEqual(2454);
  });

  test("batch 3 at 1 sat/byte", function () {
    expect(getTxFee(1, 3)).toEqual(522);
  });

  test("batch 2 at 1 sat/byte", function () {
    expect(getTxFee(1, 2)).toEqual(374);
  });
});


describe('txBuilder - Withdrawal', function () {
  let funding_txid = FUNDING_TXID;
  let funding_vout = FUNDING_VOUT;
  let rec_address = BTC_ADDR;
  let value = 10000;
  let fee_info = FEE_INFO
  let fee_per_byte = 1 // 1 sat/byte 
  
  // I added everything below
  
  let nSequence = WITHDRAW_SEQUENCE
  // let network = bitcoin.networks.bitcoin;
  
  let sc_infos = [{
    utxo: {txid:  FUNDING_TXID, 
    vout: FUNDING_VOUT},
    amount: 10000,
    chain: [],
    locktime: -1
  }];


  test('Throw on invalid value', async function() {

    sc_infos[0].amount = 0;
    // set input value 0, so fee higher than inputs

    expect(() => {  // not enough value
      txBuilder( network, sc_infos, rec_address, fee_info, WITHDRAW_SEQUENCE, fee_per_byte );
    }).toThrowError('Not enough value to cover fee.');

    sc_infos[0].amount = 100;
    // set input value 100, so fee higher than inputs

    expect(() => {  // not enough value
      txBuilder( network, sc_infos, rec_address, fee_info, WITHDRAW_SEQUENCE, fee_per_byte );
    }).toThrowError('Not enough value to cover fee.');

  });

  test('Check built tx correct 2', async function() {
    sc_infos[0].amount = 10000;
    // set input value 100000

    fee_info.withdraw = 141;
    let tx_backup = txBuilder( network, sc_infos, rec_address, fee_info, nSequence, fee_per_byte ).extractTransaction();

    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(2);
    expect(tx_backup.outs[0].value).toBeLessThan(value);
    expect(tx_backup.outs[1].value).toBe(Number(fee_info.withdraw));
    let fee_value = value - tx_backup.outs[0].value - tx_backup.outs[1].value;
    // With a 1 s/b fee, tx fee should be equal to signed tx size
    expect(fee_value).toBe(VIRTUAL_TX_SIZE);
  });

  test('Check built tx correct 3 - withdrawal fee removed', async function() {
    sc_infos[0].amount = 10000;
    // set input value 100000

    fee_info.withdraw = 0;
    let tx_backup = txBuilder( network, sc_infos, rec_address, fee_info, nSequence, fee_per_byte ).extractTransaction();

    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(1);
    expect(tx_backup.outs[0].value).toBeLessThan(value);
    let fee_value = value - tx_backup.outs[0].value ;
    // With a 1 s/b fee, tx fee should be equal to signed tx size
    expect(fee_value).toBe(FEE)
  });
});

describe('txBuilder - Batch Withdrawals', function () {
  let funding_txid = FUNDING_TXID;
  let funding_vout = FUNDING_VOUT;
  let rec_address = BTC_ADDR;
  let value = 10000;
  let fee_info = FEE_INFO;

  let fee_per_byte = 1 // 1 sat/byte 
  let nSequence = WITHDRAW_SEQUENCE;
  let sc_infos = new Array();


  beforeEach(() => {
    sc_infos = new Array()
  })

  test('Throw on invalid value', async function () {
    sc_infos.push({ utxo: { txid: funding_txid, vout: funding_vout }, amount: 1, chain: [], locktime: 0 })
    sc_infos.push({ utxo: { txid: FUNDING_TXIDS[1], vout: funding_vout }, amount: 1, chain: [], locktime: 0 })
    
    expect(() => {  // not enough value
      txBuilder( network, sc_infos, rec_address, fee_info, nSequence, fee_per_byte );
    }).toThrowError('Not enough value to cover fee.');
  });

  test('Check built tx correct 2', async function () {
    sc_infos.push({ utxo: { txid: funding_txid, vout: funding_vout }, amount: value, chain: [], locktime: 0 })
    sc_infos.push({ utxo: { txid: FUNDING_TXIDS[1], vout: funding_vout }, amount: value, chain: [], locktime: 0 })
    
    fee_info.withdraw = 141;
    let tx_backup = txBuilder(network, sc_infos, rec_address, fee_info, nSequence, fee_per_byte).extractTransaction();

    expect(tx_backup.ins.length).toBe(sc_infos.length);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(2);
    expect(tx_backup.outs[0].value).toBeLessThan(sc_infos.length * value);
    const withdraw_fee = Math.round(
      (sc_infos.length * value * fee_info.withdraw) / 10000
    );
    expect(tx_backup.outs[1].value).toEqual(withdraw_fee);
    let fee_value = sc_infos.length* value - tx_backup.outs[0].value - tx_backup.outs[1].value;

    // With a 1 s/b fee, tx fee should be equal to signed tx size
    expect(fee_value).toBe(getTxFee(fee_per_byte, sc_infos.length))
  });

  test('Check built tx correct 3 - withdrawal fee removed', async function () {
    sc_infos.push({ utxo: { txid: funding_txid, vout: funding_vout }, amount: value, chain: [], locktime: 0 })
    sc_infos.push({ utxo: { txid: FUNDING_TXIDS[1], vout: funding_vout }, amount: value, chain: [], locktime: 0 })
    
    fee_info.withdraw = 0;
    let tx_backup = txBuilder(network, sc_infos, rec_address, fee_info, nSequence, fee_per_byte).extractTransaction();

    expect(tx_backup.ins.length).toBe(sc_infos.length);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(1);
    expect(tx_backup.outs[0].value).toBeLessThan(sc_infos.length * value);

    let fee_value = sc_infos.length* value - tx_backup.outs[0].value

    // With a 1 s/b fee, tx fee should be equal to signed tx size
    expect(fee_value).toBe(getTxFeePoundDepost(fee_per_byte));
  });
});

describe("txCPFPBuild", function () {
  let funding_txid = FUNDING_TXID;
  let funding_vout = FUNDING_VOUT;
  let rec_address = BTC_ADDR;
  let value = 10000;
  let fee_rate = 2;

  var ec_pair = bitcoin.ECPair.makeRandom({ network: network });
  var p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: ec_pair.publicKey,
    network: network,
  });

  test("Throw on invalid value", async function () {
    expect(() => {
      // not enough value
      txCPFPBuild(
        network,
        funding_txid,
        funding_vout,
        rec_address,
        0,
        fee_rate,
        p2wpkh
      );
    }).toThrowError("Not enough value to cover fee.");
    expect(() => {
      // not enough value
      txCPFPBuild(
        network,
        funding_txid,
        funding_vout,
        rec_address,
        100,
        fee_rate,
        p2wpkh
      ); // should be atleast + value of network FEE also
    }).toThrowError("Not enough value to cover fee.");
  });

  test("Check built tx correct 3", async function () {
    let tx_backup = txCPFPBuild(
      network,
      funding_txid,
      funding_vout,
      rec_address,
      value,
      fee_rate,
      p2wpkh
    ).extractTransaction();
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(1);
    expect(tx_backup.outs[0].value).toBeLessThan(value);
  });

  test("Check correct fee rate", async function () {
    let txb = txCPFPBuild(
      network,
      funding_txid,
      funding_vout,
      rec_address,
      value,
      fee_rate,
      p2wpkh
    ).extractTransaction();

    let tx_fee = fee_rate * (FEE + FEE_1I1O) - FEE;

    expect(value - tx_fee).toBe(txb.outs[0].value);
  });
});

test("callGetArgsHasTestnet", async function () {
  let result = await callGetArgsHasTestnet();
  expect(result).toEqual(true);
});

test("bech32 encode/decode", async function () {
  let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
  wallet.config.update({ min_anon_set: 1000, jest_testing_mode: true }); // update config to ensure defaults are not revered to after fromJSON.

  let proof_key = PROOF_KEY;
  let encode = encodeSCEAddress(proof_key, wallet);
  expect(encode.slice(0, 2)).toBe("sc");
  let decode = decodeSCEAddress(encode, wallet);
  expect(proof_key).toBe(decode);

  let wallet_testnet = await Wallet.buildMock(bitcoin.networks.testnet);
  wallet_testnet.config.update({ min_anon_set: 1000, jest_testing_mode: true }); // update config to ensure defaults are not revered to after fromJSON.
  let encode_testnet = encodeSCEAddress(proof_key, wallet_testnet);
  expect(encode_testnet.slice(0, 2)).toBe("tc");
  let decode_testnet = decodeSCEAddress(encode_testnet, wallet_testnet);
  expect(proof_key).toBe(decode_testnet);
});

test("transfer message encode/decode", function () {
  let proof_key =
    "03b971d624567214a2e9a53995ee7d4858d6355eb4e3863d9ac540085c8b2d12b3";

  let tx_backup_psm = {
    shared_key_ids: [SHARED_KEY_ID],
    protocol: "Transfer",
    tx_hex: BACKUP_TX_HEX,
    input_addrs: [],
    input_amounts: [],
    proof_key: proof_key,
  };

  let t1 = {
    secret_bytes: Array.from([
      4, 154, 205, 188, 28, 191, 7, 132, 185, 70, 179, 167, 78, 190, 252, 36,
      187, 241, 6, 52, 130, 67, 8, 170, 148, 99, 121, 38, 221, 56, 71, 227, 57,
      41, 20, 186, 135, 207, 193, 131, 77, 250, 120, 130, 170, 148, 7, 237, 147,
      102, 186, 142, 97, 183, 18, 4, 142, 162, 27, 220, 222, 224, 80, 179, 91,
      46, 21, 186, 23, 128, 41, 19, 218, 241, 129, 95, 206, 226, 74, 58, 140,
      170, 130, 192, 96, 86, 183, 168, 227, 221, 25, 93, 36, 143, 78, 239, 190,
      248, 24, 120, 27, 151, 165, 119, 55, 126, 98, 190, 142, 159, 44, 138, 85,
      240, 186, 50, 176, 186, 180, 163, 62, 214, 206, 39, 247,
    ]),
  };

  let trans_msg_3 = {
    shared_key_id: SHARED_KEY_ID,
    statechain_id: STATECHAIN_ID,
    t1: t1,
    statechain_sig: new StateChainSig(
      "TRANSFER",
      proof_key,
      "304402205bb830138dc807cad3c34a674e9c5804eb1a6d9a75dc4043d35c72b704b587420220299b6d09455e438d871e4c35b9a369f3ab3ec2c7196da8179db1a5b43d0c2fdc"
    ),
    tx_backup_psm: tx_backup_psm,
    rec_se_addr: proofKeyToSCEAddress(proof_key, network),
  };

  let encoded_message = encodeMessage(trans_msg_3);
  let decoded_message = decodeMessage(encoded_message, network);
  expect(decoded_message).toStrictEqual(trans_msg_3);
});

test("Secp256k Point encode/decode", async function () {
  let bip32 = ECPair.makeRandom({ compressed: false });
  let publicKey = bip32.publicKey;

  let encoded = encodeSecp256k1Point(publicKey.toString("hex"));
  let decoded = decodeSecp256k1Point(encoded);
  expect(publicKey).toStrictEqual(Buffer.from(decoded.encode()));
});

const MERCURY_ENCRYPTIONS = [
  {
    data: PROOF_KEY,
    enc: "04ba10ae2a1112cfe0afc3e3a8308787b1fd748695bb53fd8ca0debef854c732e0e88097342211b15efcf41e1c4476e6394e4d90c9d6fb9ef559984012ff6ed939dbf8b194afcb39bd3508160d4b71e6a3f8552f63dc4e599c6649da1d99f273a9011bbae3c4391d99db11a148bd19c288aed22bcc0684b4c030ef0c87",
  },
  {
    data: "b26d89e448407500bc6e68a035775f9baa435c644651ffe171c645c0ca94a5ab",
    enc: "04be40d41b35093999d3e6f23df3401a9fb3e1b01f09cd87cbed8fc74606544095620dbab97bba91bf06ddb578987ac0ce509e781ff7bb2bde35ec464c5af347675df9173618349175e7cc75a9d54f223385a383c669d47409fed6344c7f7c13183e2a025829312138ddbcada1318b38cf056e216dc63fe93a3aaf5439",
  },
  {
    data: "9302a573b48d11b96ab9459c5899ac461e15197da4c52e5d237536bc2177cc64",
    enc: "0455c23bb64470139e949298ebf7e7ab9556272fd046d9e12a9ff1280feb6868c37069cdc1e7e7ecb9b4b9ab7e5ca09dfe18b1d954528ba522ba639eb830596b076307c9e13f76f72468bd016a9cd395603cd152b0e416c113bd1a0a19f7c124fb5d59c63b3b3623682d847f4c9e366c8d7523f33a17cee98e1b6757db",
  },
];

test("ECIES encrypt/decrypt", async function () {
  const sk = PrivateKey.fromHex(
    "0000000000000000000000000000000000000000000000000000000000000001"
  );
  let data = PROOF_KEY;

  let enc = encryptECIES(sk.publicKey.toHex(), PROOF_KEY);
  let dec = decryptECIES(sk.toHex(), enc);
  expect(dec).toBe(data);

  MERCURY_ENCRYPTIONS.forEach((item) => {
    let dec = decryptECIES(sk.toHex(), item.enc);
    expect(dec).toBe(item.data);
  });
});

test("AES encrypt/decrypt", async () => {
  let passwords = ["123abc", "", "!!"];
  let data = "abc123!#@";
  passwords.forEach((password) => {
    let encrypted = encryptAES(data, password);
    let decrypted = decryptAES(encrypted, password);
    expect(decrypted).toBe(data);
  });
});
