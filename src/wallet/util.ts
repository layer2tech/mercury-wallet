// wallet utilities

import { BIP32Interface, Network, TransactionBuilder, crypto, script } from 'bitcoinjs-lib';
import { bitcoin } from 'bitcoinjs-lib/types/networks';
import { FeeInfo, Root } from './mercury/info_api';

let bech32 = require('bech32')
let typeforce = require('typeforce');
let types = require("./types")

/// Temporary - fees should be calculated dynamically
export const FEE = 300;

// Verify Spase Merkle Tree proof of inclusion
export const verifySmtProof = async (wasm_client: any, root: Root, proof_key: string, proof: any) => {
  typeforce(typeforce.oneOf(types.Root, typeforce.Null), root);
  return wasm_client.verify_statechain_smt(JSON.stringify(root.value), proof_key, JSON.stringify(proof));
}

const hexToBytes = (hex: string) => {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// Make StateChainSig message
export const signStateChain = (proof_key_der: BIP32Interface, purpose: string, data: string) => {
  let buf = Buffer.from(purpose + data, "utf8")
  let hash = crypto.sha256(buf)
  let sig = proof_key_der.sign(hash, false);

  // Encode into bip66 and remove hashType marker at the end to match Server's bitcoin::Secp256k1::Signature construction.
  let encoded = script.signature.encode(sig,1);
  encoded = encoded.slice(0, encoded.length-1);

  return encoded
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
