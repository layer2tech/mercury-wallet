// wallet utilities

import { BIP32Interface, Network, TransactionBuilder, crypto, script } from 'bitcoinjs-lib';
import { FeeInfo, Root } from './mercury/info_api';
import { Secp256k1Point } from './mercury/transfer';

let bech32 = require('bech32')
let typeforce = require('typeforce');
let types = require("./types")

let EC = require('elliptic').ec
let secp256k1 = new EC('secp256k1')

/// Temporary - fees should be calculated dynamically
export const FEE = 300;

// Verify Spase Merkle Tree proof of inclusion
export const verifySmtProof = async (wasm_client: any, root: Root, proof_key: string, proof: any) => {
  typeforce(typeforce.oneOf(types.Root, typeforce.Null), root);
  return wasm_client.verify_statechain_smt(JSON.stringify(root.value), proof_key, JSON.stringify(proof));
}

export const hexToBytes = (hex: string) => {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// Make StateChainSig message. Concat purpose string + data and sha256 hash.
const stateChainSigMessage = (purpose: string, data: string) => {
  let buf = Buffer.from(purpose + data, "utf8")
  return crypto.sha256(buf)
}

export const signStateChainSig = (proof_key_der: BIP32Interface, purpose: string, data: string) => {
  let hash = stateChainSigMessage(purpose, data);
  let sig = proof_key_der.sign(hash, false);

  // Encode into bip66 and remove hashType marker at the end to match Server's bitcoin::Secp256k1::Signature construction.
  let encoded = script.signature.encode(sig,1);
  encoded = encoded.slice(0, encoded.length-1);

  return encoded
}

export const verifyStateChainSig = (proof_key_der: BIP32Interface, purpose: string, data: string, proof: Buffer) => {
  // Re-insert hashType marker ("01" suffix) and decode from bip66
  proof = Buffer.concat([proof, Buffer.from("01", "hex")]);
  let decoded = script.signature.decode(proof);

  let hash = stateChainSigMessage(purpose, data);
  return proof_key_der.verify(hash, decoded.signature);
}



// Backup Tx builder
export const txBackupBuild = (network: Network, funding_txid: string, backup_receive_addr: string, value: number, init_locktime: number) => {
  if (FEE >= value) throw "Not enough value to cover fee.";

  let txb = new TransactionBuilder(network);
  txb.setLockTime(init_locktime);
  txb.addInput(funding_txid, 0);
  txb.addOutput(backup_receive_addr, value - FEE);
  return txb
}

// Withdraw tx builder spending funding tx to:
//     - amount-fee to receive address, and
//     - amount 'fee' to State Entity fee address
export const txWithdrawBuild = (network: Network, funding_txid: string, rec_address: string, value: number, fee_info: FeeInfo) => {
  if (fee_info.withdraw + FEE >= value) throw "Not enough value to cover fee.";

  let txb = new TransactionBuilder(network);
  txb.addInput(funding_txid, 0);
  txb.addOutput(rec_address, value - fee_info.withdraw - FEE);
  txb.addOutput(fee_info.address, fee_info.withdraw);
  return txb
}


// Bech32 encode SCEAddress (StateChain Entity Address)
export const encodeSCEAddress = (proof_key: string) => {
  let words = bech32.toWords(Buffer.from(proof_key, 'utf8'))
  return bech32.encode('sc', words)
}

// Bech32 decode SCEAddress
export const decodeSCEAddress = (sce_address: string) => {
  let decode =  bech32.decode(sce_address)
  return Buffer.from(bech32.fromWords(decode.words)).toString()
}

// encode Secp256k1Point to {x: string, y: string}
export const encodeSecp256k1Point = (publicKey: Buffer) => {
  let decoded_pub = secp256k1.curve.decodePoint(publicKey);
  return { x: decoded_pub.x.toString("hex"), y: decoded_pub.y.toString("hex") }
}

// decode Secp256k1Point to secp256k1.curve.point Buffer
export const decodeSecp256k1Point = (point: Secp256k1Point) => {
  let p = secp256k1.curve.point(point.x, point.y);
  return Buffer.from(p.encode());
}
