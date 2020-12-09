// Main wallet struct storing Keys derivation material and Mercury Statecoins.

import { Network } from 'bitcoinjs-lib';
import { MasterKey2 } from './mercury/ecdsa';

let bitcoin = require('bitcoinjs-lib')


// Wallet holds BIP32 key root and derivation progress information.
export class SharedKey {
  id: string;
  share: MasterKey2;
  value: number; //Satoshis
  state_chain_id: String;
  tx_backup_psm: PrepareSignTxMsg; // back up transaction data
  proof_key: string;
  smt_proof: InclusionProofSMT;
  unspent: boolean;
  funding_txid: string;

  constructor(id: string, share: MasterKey2, value: number) {
    this.id = id;
    this.share = share;
    this.value = value;
    this.unspent = true;
    this.state_chain_id = "";
    this.tx_backup_psm = "";
    this.proof_key = "";
    this.smt_proof = "";
    this.funding_txid = "";
  }

}


export interface PrepareSignTxMsg {

}

export interface InclusionProofSMT {

}
