import { TransactionBuilder, crypto, networks } from 'bitcoinjs-lib';
import { FEE_INFO } from '../mocks/mock_http_client';
import { FEE, txBackupBuild, txWithdrawBuild, StateChainSig, toSatoshi, fromSatoshi,
  encodeSCEAddress, decodeSCEAddress, encodeSecp256k1Point, decodeSecp256k1Point, encryptECIES, decryptECIES } from '../util';
import { FUNDING_TXID, BTC_ADDR, SIGNSTATECHAIN_DATA } from './test_data.js'

import { encrypt, decrypt, PrivateKey } from 'eciesjs'

let bip32 = require('bip32');
let bitcoin = require('bitcoinjs-lib');


test('to/from Satoshi', async function() {
  let btc = 1;
  let sat = toSatoshi(1);
  expect(sat).toBe(100000000);
  expect(fromSatoshi(sat)).toBe(btc);
});


describe('signStateChain', function() {
  let proof_key_der = bip32.fromSeed(Buffer.from("0123456789abcdef"), networks.bitcoin)

  test('Gen and Verify', async function() {
    SIGNSTATECHAIN_DATA.forEach(data => {
      let statechain_sig = StateChainSig.create(proof_key_der, data.purpose, data.data);
      expect(statechain_sig.sig).toBe(data.sig);
      expect(statechain_sig.verify(proof_key_der)).toBe(true)
    })
  });
})

describe('txBackupBuild', function() {
    let network = networks.bitcoin;
    let funding_txid = FUNDING_TXID;
    let backup_receive_addr = BTC_ADDR
    let value = 10000;
    let locktime = 100;

  test('txBackupBuild throw on value < fee', async function() {
    expect(() => {  // not enough value
      txBackupBuild(network, funding_txid, backup_receive_addr, 100, locktime);
    }).toThrowError('Not enough value to cover fee.');
  });

  test('Check built tx correct', async function() {
    let tx_backup = txBackupBuild(network, funding_txid, backup_receive_addr, value, locktime).buildIncomplete();
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(1);
    expect(tx_backup.outs[0].value).toBeLessThan(value);
    expect(tx_backup.locktime).toBe(locktime);
  });
});

describe('txWithdrawBuild', function() {
  let network = networks.bitcoin;
  let funding_txid = FUNDING_TXID;
  let rec_address = BTC_ADDR
  let value = 10000;
  let fee_info = FEE_INFO

  test('Throw on invalid value', async function() {
    expect(() => {  // not enough value
      txWithdrawBuild(network, funding_txid, rec_address, 0, fee_info);
    }).toThrowError('Not enough value to cover fee.');
    expect(() => {  // not enough value
      txWithdrawBuild(network, funding_txid, rec_address, Number(fee_info.withdraw), fee_info); // should be atleast + value of network FEE also
    }).toThrowError('Not enough value to cover fee.');
  });

  test('Check built tx correct', async function() {
    let tx_backup = txWithdrawBuild(network, funding_txid, rec_address, value, fee_info).buildIncomplete();
    expect(tx_backup.ins.length).toBe(1);
    expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(funding_txid);
    expect(tx_backup.outs.length).toBe(2);
    expect(tx_backup.outs[0].value).toBe(value-Number(fee_info.withdraw)-FEE);
    expect(tx_backup.outs[1].value).toBe(Number(fee_info.withdraw));
  });
});

test('bech32 encode/decode', function() {
  let proof_key = BTC_ADDR;
  let encode = encodeSCEAddress(proof_key);
  expect(encode.slice(0,2)).toBe("sc");
  let decode = decodeSCEAddress(encode);
  expect(proof_key).toBe(decode);
});

test('Secp256k Point encode/decode', async function() {
  let bip32 = bitcoin.ECPair.makeRandom({compressed: false});
  let publicKey = bip32.publicKey;

  let encoded = encodeSecp256k1Point(publicKey.toString("hex"));
  let decoded = decodeSecp256k1Point(encoded);
  expect(publicKey).toStrictEqual(decoded);
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
