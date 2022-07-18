// wallet utilities

import { BIP32Interface, Network, TransactionBuilder, crypto as crypto_btc, script, Transaction } from 'bitcoinjs-lib';
import { Root, StateChainDataAPI, FeeInfo, OutPoint } from './mercury/info_api';
import { Secp256k1Point } from './mercury/transfer';
import { TransferMsg3, PrepareSignTxMsg } from './mercury/transfer';
import { callGetConfig } from '../features/WalletDataSlice'
import { encrypt, decrypt, PrivateKey } from 'eciesjs12b';
import { segwitAddr } from './wallet';

// Logger import.
// Node friendly importing required for Jest tests.
declare const window: any;
let log: any;
try {
  log = window.require('electron-log');
} catch (e: any) {
  log = require('electron-log');
}

const bip32 = require('bip32');
let bech32 = require('bech32')
let bitcoin = require('bitcoinjs-lib')
let typeforce = require('typeforce');
let types = require("./types")
let crypto = require('crypto');

let EC = require('elliptic').ec
let secp256k1 = new EC('secp256k1')

/// Temporary - fees should be calculated dynamically
export const FEE = 141;
//FEE for backup transaction 2 outputs 1 input P2WPKH
export const MINIMUM_DEPOSIT_SATOSHI = 100000;
export const VIRTUAL_TX_SIZE = 226;
//VIRTUAL_TX: 2 outputs 1 input (max byte size P2PKH)
export const INPUT_TX_SIZE = 148;
//INPUT_TX: 1 input (max byte size P2PKH)

// Verify Spase Merkle Tree proof of inclusion
export const verifySmtProof = async (wasm_client: any, root: Root, proof_key: string, proof: any) => {
  typeforce(typeforce.oneOf(types.Root, typeforce.Null), root);
  return wasm_client.verify_statechain_smt(JSON.stringify(root.value), proof_key, JSON.stringify(proof));
}

export const pubKeyTobtcAddr = (pub_key: string, network: Network) => {
  return segwitAddr({publicKey: Buffer.from(pub_key, "hex")}, network)
}

export const pubKeyToScriptPubKey = (pub_key: string, network: Network) => {
  return bitcoin.address.toOutputScript(pubKeyTobtcAddr(pub_key, network), network)
}

export const proofKeyToSCEAddress = (proof_key: string, network: Network) => {
  return {
    tx_backup_addr: pubKeyTobtcAddr(proof_key, network),
    proof_key: proof_key
  }
}

export const hexToBytes = (hex: string) => {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// BTC value -> Satoshi value
export const toSatoshi = (btc: number) => { return Math.floor(btc * 10e7) }
// Satoshi value -> BTC value
export const fromSatoshi = (sat: number) => { return sat / 10e7 }

export class StateChainSig {
    purpose: string; // "TRANSFER", "TRANSFER-BATCH" or "WITHDRAW"
    data: string;    // proof key, state chain id or address
    sig: string;

    constructor(purpose: string, data: string, sig: string) {
      this.purpose = purpose;
      this.data = data;
      this.sig = sig;
    }

    static construct(purpose: string, data: string, sig: string) : StateChainSig {
      let result = new StateChainSig(purpose, data, sig);
      return result
    }

    static create(
      proof_key_der: BIP32Interface,
      purpose: string,
      data: string
    ): StateChainSig {
      let statechain_sig = new StateChainSig(purpose, data, "");
      let hash = statechain_sig.to_message();
      let sig = proof_key_der.sign(hash, false);

      // Encode into bip66 and remove hashType marker at the end to match Server's bitcoin::Secp256k1::Signature construction.
      let encoded_sig = script.signature.encode(sig,1);
      encoded_sig = encoded_sig.slice(0, encoded_sig.length-1);
      statechain_sig.sig = encoded_sig.toString("hex");

      return statechain_sig
    }

    // Make StateChainSig message. Concat purpose string + data and sha256 hash.
    to_message(): Buffer {
      let buf = Buffer.from(this.purpose + this.data, "utf8")
      return crypto_btc.sha256(buf)
    }

    // Verify self's signature for transfer or withdraw
    verify(proof_key_der: BIP32Interface): boolean {
      let proof = Buffer.from(this.sig, "hex");
      // Re-insert hashType marker ("01" suffix) and decode from bip66
      proof = Buffer.concat([proof, Buffer.from("01", "hex")]);
      let decoded = script.signature.decode(proof);

      let hash = this.to_message();
      return proof_key_der.verify(hash, decoded.signature);
    }

    /// Generate signature to request participation in a batch transfer
      static new_transfer_batch_sig(
          proof_key_der: BIP32Interface,
          batch_id: string,
          statechain_id: string,
      ): StateChainSig {
          let purpose = this.purpose_transfer_batch(batch_id);
          let statechain_sig = StateChainSig.create(proof_key_der,purpose, statechain_id);
          return statechain_sig;
      }

      static purpose_transfer_batch(batch_id: string):string{
        let buf =  "TRANSFER_BATCH:" + batch_id;
        return buf;
      }

}

export const getSigHash = (tx: Transaction, index: number, pk: string, amount: number, network: Network): string => {
  let addr_p2pkh = bitcoin.payments.p2pkh({
    pubkey: Buffer.from(pk, "hex"),
    network: network
  }).address;
  let script = bitcoin.address.toOutputScript(addr_p2pkh, network);
  return tx.hashForWitnessV0(index, script, amount, Transaction.SIGHASH_ALL).toString("hex");
}

// Backup Tx builder
export const txBackupBuild = (network: Network, funding_txid: string, funding_vout: number, backup_receive_addr: string, value: number, fee_address: string, withdraw_fee: number, init_locktime: number): TransactionBuilder => {
  if (FEE+withdraw_fee >= value) throw Error(`Not enough value to cover fee. FEE:${FEE}, withdraw_fee:${withdraw_fee}, value:${value}`);

  let txb = new TransactionBuilder(network);
  txb.setLockTime(init_locktime);
  txb.addInput(funding_txid, funding_vout, 0xFFFFFFFE);
  txb.addOutput(backup_receive_addr, value - FEE - withdraw_fee);
  txb.addOutput(fee_address, withdraw_fee);
  return txb
}

// Withdraw tx builder spending funding tx to:
//     - amount-fee to receive address, and
//     - amount 'fee' to State Entity fee address
export const txWithdrawBuild = (network: Network,    funding_txid: string, funding_vout: number, rec_address: string, value: number, fee_address: string, withdraw_fee: number, fee_per_byte: number): TransactionBuilder => {

  let tx_fee = getTxFee(fee_per_byte, 1)

  if (withdraw_fee + tx_fee >= value) throw Error("Not enough value to cover fee.");

  let txb = new TransactionBuilder(network);

  txb.addInput(funding_txid, funding_vout, 0xFFFFFFFD);
  txb.addOutput(rec_address, value - tx_fee - withdraw_fee);
  txb.addOutput(fee_address, withdraw_fee);

  return txb
}

export const getTxFee = (fee_per_byte: number, n_inputs: number = 1): number => {
  return Math.round(fee_per_byte * (VIRTUAL_TX_SIZE + (INPUT_TX_SIZE * (n_inputs - 1))) * 10e7) / 10e7
}

// Withdraw tx builder spending funding tx to:
//     - amount-fee to receive address, and
//     - amount 'fee' to State Entity fee address
export const txWithdrawBuildBatch = (network: Network, sc_infos: Array<StateChainDataAPI>, rec_address: string, fee_info: FeeInfo, fee_per_byte: number): TransactionBuilder => {
  // let txin = []; - not being used
  let value = 0;
  console.log("tx builder")
  let txb: TransactionBuilder = new TransactionBuilder(network);
  let index = 0;

  for(let info of sc_infos){
    let utxo: OutPoint = info.utxo;
    if (utxo !== undefined) {
      value = value + info.amount;
      let txid: string = utxo.txid;
      let vout: number = utxo.vout;
      txb.addInput(txid, vout, 0xFFFFFFFD);
    };
    index = index + 1;
  }
    
  let withdraw_fee = Math.round((value * fee_info.withdraw) / 10000)//(value * fee_info.withdraw) / 10000

  let tx_fee = getTxFee(fee_per_byte, sc_infos.length)
    
  if (withdraw_fee + tx_fee >= value) throw Error("Not enough value to cover fee.");
  
  txb.addOutput(rec_address,value - tx_fee - withdraw_fee)

  txb.addOutput(fee_info.address, withdraw_fee);
  
  return txb
}

// CPFP tx builder spending backup tx to user specified address
export const txCPFPBuild = (network: Network, funding_txid: string, funding_vout: number, rec_address: string, value: number, fee_rate: number, p2wpkh: any): TransactionBuilder => {
  // Total size of backup_tx (1 input 2 outputs) + 1-input-1-output = 140 + 110 bytes
  // Subtract the fee already paid in the backup-tx
  let total_fee = (fee_rate * 250) - FEE;

  if (total_fee >= value) throw Error("Not enough value to cover fee.");

  let txb = new TransactionBuilder(network);

  txb.addInput(funding_txid, funding_vout, 0xFFFFFFFF, p2wpkh.output);
  txb.addOutput(rec_address, value - total_fee);
  return txb
}

// Bech32 encode SCEAddress (StateChain Entity Address)
export const encodeSCEAddress = (proof_key: string, test_wallet: any = null) => {
  let config
    if(test_wallet?.config.jest_testing_mode){
      // For Jest testing, preset wallet
      // Prevents needing a redux state loaded
      config = callGetConfig(test_wallet)
    }
    else{
      config = callGetConfig()
    }
    
  let network = config?.network
  if(network !== undefined && network.wif === 239){
    network = 'tc'
  } else {
    network = 'sc'
  }

  let words = bech32.toWords(Buffer.from(proof_key, 'hex'))
  return bech32.encode(network, words)
}

// Bech32 decode SCEAddress
export const decodeSCEAddress = (sce_address: string): string => {
  let SCEAddress;
  try{
    let decode =  bech32.decode(sce_address)
    SCEAddress = Buffer.from(bech32.fromWords(decode.words)).toString('hex')
  }
  catch(e : any){
    throw new Error("Invalid Statechain Address - " + e.message)
  }
  return SCEAddress
}

export const proofKeyFromXpub = (xpub: string, index: number, network: Network) => {
  let proof_key;
  proof_key = bip32.fromBase58(xpub,network).derive(0).derive(index).publicKey.toString('hex');
  // console.log('public Key',bip32.fromBase58(xpub,network).derive(0).derive(index).publicKey)
  // const { address } = bitcoin.payments.p2wpkh({
  //   pubkey: bip32.fromBase58(xpub,network).derive(0).derive(index).publicKey,
  //   network: network
  // });
  // try{
  //   let decode =  bech32.decode(address)
  //   let words = bech32.toWords(decode.words)
  //   proof_key = bech32.encode('tc',words);
  // }
  // catch(e : any){
  //   throw new Error("Invalid Xpub - " + e.message)
  // }
  return proof_key
}

// Bech32 encode transfer message
export const encodeMessage = (message: TransferMsg3) => {

  // compact message serialisation to byte vector
  let item_array = [];
  //bytes 0..129 encrypted t1
  item_array.push(Buffer.from(message.t1.secret_bytes));
  //bytes 129..162 (33 bytes) compressed proof key
  item_array.push(Buffer.from(message.rec_se_addr.proof_key, 'hex'));
  //bytes 162..178 (16 bytes) statechain_id
  item_array.push(Buffer.from(message.statechain_id.replace(/-/g, ""), 'hex'));
  //bytes 178..194 (16 bytes) shared_key_id
  item_array.push(Buffer.from(message.shared_key_id.replace(/-/g, ""), 'hex'));
  //byte 194 is statechain signature length (variable)
  let sig_bytes = Buffer.from(message.statechain_sig.sig, 'hex');
  item_array.push(Buffer.from([sig_bytes.length]));
  //byte 195..sig_len is statechain signature
  item_array.push(sig_bytes);
  //byte tx_len is backup tx length (variable)
  let tx_bytes = Buffer.from(message.tx_backup_psm.tx_hex, 'hex');
  item_array.push(Buffer.from([tx_bytes.length]));
  //remaining bytes backup tx
  item_array.push(tx_bytes);

  let encoded_bytes = Buffer.concat(item_array);

  let words = bech32.toWords(encoded_bytes);
  return bech32.encode('mm', words, 6000)
}

// Bech32 decode transfer message
export const decodeMessage = (enc_message: string, network: Network): TransferMsg3 => {

  let buf;

  try{
    let decode =  bech32.decode(enc_message, 6000);
    buf = Buffer.from(bech32.fromWords(decode.words));
  } catch(e : any){
    throw new Error("Invalid Transfer Key - " + e.message)
  }
  
  
  // compact byte message deserialisation
  //bytes 0..129 encrypted t1
  let t1_bytes = buf.slice(0,125);
  //bytes 129..162 (33 bytes) compressed proof key
  let proof_key_bytes = buf.slice(125,158);
  //bytes 162..178 (16 bytes) statechain_id
  let statechain_id_bytes = buf.slice(158,174);
  //bytes 178..194 (16 bytes) shared_key_id
  let shared_key_id_bytes = buf.slice(174,190);
  //byte 194 is statechain signature length (variable)
  let sig_len = buf.readUInt8(190);
  //byte 195..sig_len is statechain signature
  let sig = buf.slice(191,(sig_len+191));
  //byte tx_len is backup tx length (variable)
  let tx_len = buf.readUInt8(sig_len+191);
  //remaining bytes backup tx
  let backup_tx_bytes = buf.slice((sig_len+192),(sig_len+tx_len+192));

  // convert uuids
  let sch_id = statechain_id_bytes.toString("hex");
  let statechain_id = sch_id.substr(0,8)+"-"+sch_id.substr(8,4)+"-"+sch_id.substr(12,4)+"-"+sch_id.substr(16,4)+"-"+sch_id.substr(20);

  let shk_id = shared_key_id_bytes.toString("hex");
  let shared_key_id = shk_id.substr(0,8)+"-"+shk_id.substr(8,4)+"-"+shk_id.substr(12,4)+"-"+shk_id.substr(16,4)+"-"+shk_id.substr(20);

  let proof_key = proof_key_bytes.toString('hex');

  let tx_backup_psm: PrepareSignTxMsg = {
          shared_key_ids: [shared_key_id],
          protocol: "Transfer",
          tx_hex: backup_tx_bytes.toString('hex'),
          input_addrs: [],
          input_amounts: [],
          proof_key: proof_key,
        };

  // re-create transfer message
  let trans_msg_3 = {
      shared_key_id: shared_key_id,
      statechain_id: statechain_id,
      t1: {secret_bytes: Array.from(t1_bytes)},
      statechain_sig: new StateChainSig("TRANSFER",proof_key,sig.toString('hex')),
      tx_backup_psm: tx_backup_psm,
      rec_se_addr: proofKeyToSCEAddress(proof_key, network)
  };

  return trans_msg_3
}

// encode Secp256k1Point to {x: string, y: string}
export const encodeSecp256k1Point = (publicKey: string): {x: string, y: string} => {
  let decoded_pub = secp256k1.curve.decodePoint(Buffer.from(publicKey, 'hex'));
  return { x: decoded_pub.x.toString("hex"), y: decoded_pub.y.toString("hex") }
}

// decode Secp256k1Point to secp256k1.curve.point Buffer
export const decodeSecp256k1Point = (point: Secp256k1Point) => {
  let p = secp256k1.curve.point(point.x, point.y);
  return p;
}

const zero_pad = (num: any) => {
    var pad = '0000000000000000000000000000000000000000000000000000000000000000';
    return (pad + num).slice(-pad.length);
}

// ECIES encrypt string
export const encryptECIES = (publicKey: string, data: string): Buffer => {
  log.debug('encryptECIES...')
  let data_arr = new Uint32Array(Buffer.from(zero_pad(data), "hex"));
  let result = encrypt(publicKey, Buffer.from(data_arr));
  log.debug('encryptECIES: return...')
  return result;  
}

// ECIES decrypt string x1 from Server.
export const decryptECIES = (secret_key: string, encryption: string): string => {
  log.debug('decryptECIES...')
  let enc = new Uint32Array(Buffer.from(encryption, "hex"))
  let dec = decrypt(secret_key, Buffer.from(enc));
  let result = dec.toString("hex")
  log.debug('decryptECIES: return...')
  return result
}

const AES_ALGORITHM = 'aes-192-cbc';
const PBKDF2_HASH_ALGORITHM = 'sha512';
const PBKDF2_NUM_ITERATIONS = 2000;

export interface EncryptionAES {
  iv: string,
  encryption: string
}

// AES encrypt with password
export const encryptAES = (data: string, password: string): EncryptionAES => {
  const key = crypto.pbkdf2Sync(password, 'salt', PBKDF2_NUM_ITERATIONS, 24, PBKDF2_HASH_ALGORITHM);
  let iv = crypto.randomFillSync(new Uint8Array(16))
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: Buffer.from(iv).toString("hex"),
    encryption: encrypted
  }
}

// AES decrypt with password
export const decryptAES = (encryption: EncryptionAES, password: string) => {
  const key = crypto.pbkdf2Sync(password, 'salt', PBKDF2_NUM_ITERATIONS, 24, PBKDF2_HASH_ALGORITHM);
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, Buffer.from(encryption.iv, "hex"));

  let decrypted = decipher.update(encryption.encryption, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted
}