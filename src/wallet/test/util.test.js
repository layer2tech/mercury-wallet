import { TransactionBuilder, networks, ECPair } from 'bitcoinjs-lib';
import { FEE_INFO } from '../mocks/mock_http_client';
import { FEE, txBackupBuild, txWithdrawBuild, txCPFPBuild, StateChainSig, toSatoshi, fromSatoshi,
  encodeSCEAddress, decodeSCEAddress, encodeSecp256k1Point, decodeSecp256k1Point,
  encryptECIES, decryptECIES, encryptAES, decryptAES } from '../util';
import { FUNDING_TXID, FUNDING_VOUT, BTC_ADDR, SIGNSTATECHAIN_DATA, PROOF_KEY } from './test_data.js'
import { Wallet } from '../';

import { encrypt, decrypt, PrivateKey } from 'eciesjs'

let bip32 = require('bip32');
var crypto = require('crypto')
let bitcoin = require('bitcoinjs-lib');

let network = networks.testnet;

test('to/from Satoshi', async function() {
  let btc = 1;
  let sat = toSatoshi(1);
  expect(sat).toBe(100000000);
  expect(fromSatoshi(sat)).toBe(btc);
});


describe('signStateChain', function() {
  let proof_key_der = bip32.fromSeed(Buffer.from("0123456789abcdef"), network)

  test('Gen and Verify', async function() {
    SIGNSTATECHAIN_DATA.forEach(data => {
      let statechain_sig = StateChainSig.create(proof_key_der, data.purpose, data.data);
      expect(statechain_sig.sig).toBe(data.sig);
      expect(statechain_sig.verify(proof_key_der)).toBe(true)
    })
  });
})

describe('txBackupBuild', function() {
    let funding_txid = FUNDING_TXID;
    let funding_vout = FUNDING_VOUT;
    let backup_receive_addr = BTC_ADDR
    let value = 10000;
    let locktime = 100;

  test('txBackupBuild throw on value < fee', async function() {
    expect(() => {  // not enough value
      txBackupBuild(network, funding_txid, funding_vout, backup_receive_addr, 100, backup_receive_addr, 100, locktime);
    }).toThrowError('Not enough value to cover fee.');
  });

  test('Check built tx correct', async function() {
    let tx_backup = txBackupBuild(network, funding_txid, funding_vout, backup_receive_addr, value, backup_receive_addr, 100, locktime).buildIncomplete();
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(2);
    expect(tx_backup.outs[0].value).toBeLessThan(value);
    expect(tx_backup.locktime).toBe(locktime);
  });
});

describe('txWithdrawBuild', function() {
  let funding_txid = FUNDING_TXID;
  let funding_vout = FUNDING_VOUT;
  let rec_address = BTC_ADDR
  let value = 10000;
  let fee_info = FEE_INFO

  test('Throw on invalid value', async function() {
    expect(() => {  // not enough value
      txWithdrawBuild(network, funding_txid, funding_vout, rec_address, 0, fee_info.address, Number(fee_info.withdraw));
    }).toThrowError('Not enough value to cover fee.');
    expect(() => {  // not enough value
      txWithdrawBuild(network, funding_txid, funding_vout, rec_address, 100, fee_info.address, Number(fee_info.withdraw)); // should be atleast + value of network FEE also
    }).toThrowError('Not enough value to cover fee.');
  });

  test('Check built tx correct', async function() {
    let tx_backup = txWithdrawBuild(network, funding_txid, funding_vout, rec_address, value, rec_address, Number(fee_info.withdraw)).buildIncomplete();
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(2);
    expect(tx_backup.outs[0].value).toBeLessThan(value);
    expect(tx_backup.outs[1].value).toBe(Number(fee_info.withdraw));
  });
});

describe('txCPFPBuild', function() {
  let funding_txid = FUNDING_TXID;
  let funding_vout = FUNDING_VOUT;
  let rec_address = BTC_ADDR
  let value = 10000;
  let fee_rate = 2;

  var ec_pair = bitcoin.ECPair.makeRandom({network: network});
  var p2wpkh = bitcoin.payments.p2wpkh({ pubkey: ec_pair.publicKey, network: network })  

  test('Throw on invalid value', async function() {
    expect(() => {  // not enough value
      txCPFPBuild(network, funding_txid, funding_vout, rec_address, 0, fee_rate, p2wpkh);
    }).toThrowError('Not enough value to cover fee.');
    expect(() => {  // not enough value
      txCPFPBuild(network, funding_txid, funding_vout, rec_address, 100, fee_rate, p2wpkh); // should be atleast + value of network FEE also
    }).toThrowError('Not enough value to cover fee.');
  });

  test('Check built tx correct', async function() {
    let tx_backup = txCPFPBuild(network, funding_txid, funding_vout, rec_address, value, fee_rate, p2wpkh).buildIncomplete();
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(1);
    expect(tx_backup.outs[0].value).toBeLessThan(value);
  });
});

test('bech32 encode/decode', function() {
  let proof_key = PROOF_KEY;
  let encode = encodeSCEAddress(proof_key);
  expect(encode.slice(0,2)).toBe("sc");
  let decode = decodeSCEAddress(encode);
  expect(proof_key).toBe(decode);
});

test('Secp256k Point encode/decode', async function() {
  let bip32 = ECPair.makeRandom({compressed: false});
  let publicKey = bip32.publicKey;

  let encoded = encodeSecp256k1Point(publicKey.toString("hex"));
  let decoded = decodeSecp256k1Point(encoded);
  expect(publicKey).toStrictEqual(Buffer.from(decoded.encode()));
});


const MERCURY_ENCRYPTIONS = [
  { data: "str1", enc: "04293ffc6c67bdd866838a95f13541982182dcde87d89e7037a13665b1246a654198f3911682de79c89e2b5c8466f99f486e475929b88473bbc46f4112ea1da2ab10d892ef8a11ec2ded92878c2850385c475c470b51edb50bc07d7cf2b0f6e00c5429cf6dd55e" },
  { data: "123456", enc: "04d037a01346a3337e9dc60c3552957a199ce3121b0f399ae348d146f000996038d91d151ffffd8177ccd9a9adc58a9288c921bf1945ded60f0298d6a57314de7379f529fdfea4e4c95b00d496809d1cabe857e50245bd71493e328440312703b6638f60a516125a70" },
  { data: "8972302757y7823r892dy83ydo9nz3y7ydo3ud", enc: "047adfadf1e70d472c68b46c804a876ef61dce075a4c9f3eb936ec61c542a3a54071be86f3bd037d9d0466baa6c0a894356ee051992e46e1ebef9a5e5b3b4aa11f06f3d7dfe85c5684b7777131fb9407bc285dadbf29d321676f6ce000cff8fa0a4c71a1b66ac933627f6f0ad1e8ee74d10596d2524045cff5689ebc9797811d2f25fe699959cbe09c" }
]

test('ECIES encrypt/decrypt', async function() {
  const sk = PrivateKey.fromHex("0000000000000000000000000000000000000000000000000000000000000001")
  let data = "str1"

  let enc = encryptECIES(sk.publicKey.toHex(), "str1")
  let dec = decryptECIES(sk.toHex(), enc);
  expect(dec).toBe(data);

  MERCURY_ENCRYPTIONS.forEach(item => {
    let dec = decryptECIES(sk.toHex(), item.enc);
    expect(dec).toBe(item.data);
  })
});


test('AES encrypt/decrypt', async () => {
  let passwords = ['123abc', '', "!!"];
  let data = "abc123!#@"
  passwords.forEach(password => {
    let encrypted = encryptAES(data, password);
    let decrypted = decryptAES(encrypted, password);
    expect(decrypted).toBe(data);
  })
})
