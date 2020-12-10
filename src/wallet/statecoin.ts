// Statecoin is a Mercury shared key along with all deposit information.

import { MasterKey2 } from "./mercury/ecdsa"

let bitcoin = require('bitcoinjs-lib')

export class StateCoinList {
  coins: StateCoin[]

  constructor() {
    this.coins = [];
  }

  static fromJSON(json: any) {
    let statecoins = new StateCoinList()
    JSON.parse(json).coins.forEach((item: StateCoin) => {
      let coin = new StateCoin(item.id, item.shared_key, item.value);
      statecoins.coins.push(Object.assign(coin, item))
    })
    return statecoins
  }

  getAllCoins() {
    return this.coins.map((item: StateCoin) => {
      return item.getDisplayInfo()
    })
  };

  getUnspentCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (!item.spent) {
        return item.getDisplayInfo()
      }
    })
  };

  getCoin(id: string) {
    return this.coins.reverse().find(coin => coin.id == id)
  }

  // adds coin with Date.now()
  addCoin(id: string, shared_key: MasterKey2, value: number) {
    this.coins.push(new StateCoin(id, shared_key, value))
  };

  setCoinFundingTxid(id: string, txid: string) {
    let coin = this.getCoin(id)
    if (coin) {
      coin.funding_txid = txid
    } else {
      throw "No coin found with id " + id
    }
  }

  setCoinSpent(id: string) {
    let coin = this.getCoin(id)
    if (coin) {
      coin.spent = true
    } else {
      throw "No coin found with id " + id
    }
  }
}


// Each individual StateCoin
export class StateCoin {
  id: string;               // SharedKeyId
  state_chain_id: String;   // StateChainId
  shared_key: MasterKey2;
  proof_key: string;
  value: number;
  funding_txid: string;
  timestamp: number;
  tx_backup_psm: PrepareSignTxMsg;
  smt_proof: InclusionProofSMT;
  swap_rounds: number;
  confirmed: boolean;
  spent: boolean;

  constructor(id: string, shared_key: MasterKey2, value: number) {
    this.id = id;
    this.state_chain_id = "";
    this.shared_key = shared_key;
    this.proof_key = "";
    this.value = value;
    this.timestamp = new Date().getTime();

    this.funding_txid = "";
    this.swap_rounds = 0
    this.tx_backup_psm = "";
    this.smt_proof = "";
    this.confirmed = false
    this.spent = false
  }

  // Get data to display in GUI
  getDisplayInfo() {
    return {
      id: this.id,
      value: this.value,
      funding_txid: this.funding_txid,
      timestamp: this.timestamp,
      swap_rounds: this.swap_rounds
    }
  };

  // Generate BTC address from SharedKey
  async getBtcAddress() {
    let wasm = await import('client-wasm');
    return wasm.curv_pk_to_bitcoin_public_key(
      JSON.stringify(
        this.shared_key.public.q
      )
    );
  }
}


export interface PrepareSignTxMsg {

}

export interface InclusionProofSMT {

}
