import { TransactionBuilder, networks, ECPair, BIP32Interface } from 'bitcoinjs-lib';
import { FEE_INFO } from '../mocks/mock_http_client';
import { FEE, txBackupBuild, txWithdrawBuild, txCPFPBuild, StateChainSig, toSatoshi, fromSatoshi,
  encodeSCEAddress, decodeSCEAddress, encodeSecp256k1Point, decodeSecp256k1Point,
  encryptECIES, decryptECIES, encryptAES, decryptAES, proofKeyToSCEAddress, encodeMessage, decodeMessage } from '../util';
import { FUNDING_TXID, FUNDING_VOUT, BTC_ADDR, SIGNSTATECHAIN_DATA, PROOF_KEY, SECRET_BYTES, BACKUP_TX_HEX, SHARED_KEY_ID, STATECHAIN_ID } from './test_data.js'
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

test('transfer message encode/decode', function() {

  let proof_key = "03b971d624567214a2e9a53995ee7d4858d6355eb4e3863d9ac540085c8b2d12b3";

  let tx_backup_psm = {
          shared_key_id: SHARED_KEY_ID,
          protocol: "Transfer",
          tx_hex: BACKUP_TX_HEX,
          input_addrs: [],
          input_amounts: [],
          proof_key: proof_key,
        };

  let t1 = {secret_bytes: Array.from([4, 56, 87, 6, 105, 142, 166, 89, 114, 187, 249, 14, 19, 73, 207, 122, 216, 178, 29, 29, 54, 152, 186, 203, 142, 176, 55, 37, 39, 97, 90, 198, 168, 103, 102, 3, 205, 201, 43, 113, 170, 28, 28, 16, 31, 123, 192, 185, 131, 156, 244, 169, 112, 164, 229, 239, 24, 183, 225, 149, 125, 182, 42, 171, 115, 196, 105, 214, 122, 134, 60, 189, 113, 27, 249, 144, 52, 129, 180, 83, 65, 227, 119, 44, 187, 139, 84, 25, 94, 107, 104, 56, 186, 240, 137, 25, 139, 226, 14, 182, 135, 217, 180, 219, 255, 123, 199, 35, 207, 18, 27, 184, 222, 83, 106, 86, 92, 23, 237, 252, 58, 150, 39, 47, 136, 216, 235, 23, 63])};

  let trans_msg_3 = { 
      shared_key_id: SHARED_KEY_ID,
      statechain_id: STATECHAIN_ID,
      t1: t1,
      statechain_sig: new StateChainSig("TRANSFER",proof_key,"304402205bb830138dc807cad3c34a674e9c5804eb1a6d9a75dc4043d35c72b704b587420220299b6d09455e438d871e4c35b9a369f3ab3ec2c7196da8179db1a5b43d0c2fdc"),
      tx_backup_psm: tx_backup_psm,
      rec_se_addr: proofKeyToSCEAddress(proof_key, network)
  };

  let encoded_message = encodeMessage(trans_msg_3);
  let decoded_message = decodeMessage(encoded_message, network);
  expect(decoded_message).toStrictEqual(trans_msg_3);
});

test('Secp256k Point encode/decode', async function() {
  let bip32 = ECPair.makeRandom({compressed: false});
  let publicKey = bip32.publicKey;

  let encoded = encodeSecp256k1Point(publicKey.toString("hex"));
  let decoded = decodeSecp256k1Point(encoded);
  expect(publicKey).toStrictEqual(Buffer.from(decoded.encode()));
});


const MERCURY_ENCRYPTIONS = [
  { data: PROOF_KEY, enc: "044453a5a7466008171dcb4acd909a2fd47daaeac86ad6047cc968a9ccce32760ede105813e77084b799b2edcbfa0472b5ce5a3774e16deb0c6f072415fd50b7685dbc4543baad8d3eefec12bac6b4c62334909af9aca02cfb2f2eb7b921876b505c14291bce9e2ee44a419b9f609b02f101f6e2b06ff51e043fd7d2f5ba23735b" },
  { data: "b26d89e448407500bc6e68a035775f9baa435c644651ffe171c645c0ca94a5ab", enc: "048f8a9f6773cf0ad1c340c3ceebb6c2192221b91eb5738e42080c27c08c66e575119b8bff915eaf0502479201ee8ba73b1180cd159734d12c020a3bbb794ac57ff54c1815befe0fabe35abb1331073215e4d53e13d98191411053d93103019eabd2abb5dc06572fa4be0e065c0f04d93545f3bba75c874bd563bc8e73e0b5c91d" },
  { data: "9302a573b48d11b96ab9459c5899ac461e15197da4c52e5d237536bc2177cc64", enc: "041164dfed1b4f1a68f81784f6ab92850fc5b535607000dd8cd1cda92a4cb6cb065cae1ec3ed478eabbbf511c0003ab844d530845f5ba8d80c80a150a606dee478b57b736aa288f5f1d7fbeee1314d029e0395e2ac9318215bf2a14be183f485bd8e172f9ab163fed3982fc0f21b2b4e9284753e6f7ed2f07cf8f08ef7b991f5d5" }
]

test('ECIES encrypt/decrypt', async function() {
  const sk = PrivateKey.fromHex("0000000000000000000000000000000000000000000000000000000000000001")
  let data = PROOF_KEY

  let enc = encryptECIES(sk.publicKey.toHex(), PROOF_KEY)
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
