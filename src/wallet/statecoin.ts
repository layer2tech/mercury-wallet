// Statecoin is a Mercury shared key along with all deposit information.

import { Network } from "bitcoinjs-lib";
import { Transaction as BTCTransaction } from "bitcoinjs-lib/types/transaction";
import { MasterKey2 } from "./mercury/ecdsa"
import { pubKeyTobtcAddr } from "./wallet";

export class StateCoinList {
  coins: StateCoin[]

  constructor() {
    this.coins = [];
  }

  static fromJSON(json: any) {
    let statecoins = new StateCoinList()
    JSON.parse(json).coins.forEach((item: StateCoin) => {
      let coin = new StateCoin(item.shared_key_id, item.shared_key);
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
      return
    })
  };

  getCoin(shared_key_id: string) {
    return this.coins.reverse().find(coin => coin.shared_key_id === shared_key_id)
  }

  // creates new coin with Date.now()
  addNewCoin(shared_key_id: string, shared_key: MasterKey2) {
    this.coins.push(new StateCoin(shared_key_id, shared_key))
  };

  addCoin(statecoin: StateCoin) {
    this.coins.push(statecoin)
  };


  setCoinFundingTxidAndValue(shared_key_id: string, txid: string, value: number) {
    let coin = this.getCoin(shared_key_id)
    if (coin) {
      coin.funding_txid = txid
      coin.value = value
    } else {
      throw "No coin found with shared_key_id " + shared_key_id
    }
  }

  setCoinSpent(shared_key_id: string) {
    let coin = this.getCoin(shared_key_id)
    if (coin) {
      coin.spent = true
    } else {
      throw "No coin found with shared_key_id " + shared_key_id
    }
  }

  setCoinFinalized(finalized_statecoin: StateCoin) {
    let statecoin = this.getCoin(finalized_statecoin.shared_key_id)
    // TODO: do some checks here
    if (statecoin) {
      statecoin = finalized_statecoin
    } else {
      throw "No coin found with shared_key_id " + finalized_statecoin.shared_key_id
    }
  }

  setCoinWithdrawTx(shared_key_id: string, tx_withdraw: BTCTransaction) {
    let coin = this.getCoin(shared_key_id)
    if (coin) {
      coin.tx_withdraw = tx_withdraw
    } else {
      throw "No coin found with shared_key_id " + shared_key_id
    }
  }
}


// Each individual StateCoin
export class StateCoin {
  shared_key_id: string;    // SharedKeyId
  statechain_id: string;   // StateChainId
  shared_key: MasterKey2;
  proof_key: string;
  value: number;
  funding_txid: string;
  timestamp: number;
  tx_backup: BTCTransaction | null;
  tx_withdraw: BTCTransaction | null;
  smt_proof: InclusionProofSMT | null;
  swap_rounds: number;
  confirmed: boolean;
  spent: boolean;

  constructor(shared_key_id: string, shared_key: MasterKey2) {
    this.shared_key_id = shared_key_id;
    this.statechain_id = "";
    this.shared_key = shared_key;
    this.proof_key = "";
    this.value = 0;
    this.timestamp = new Date().getTime();

    this.funding_txid = "";
    this.swap_rounds = 0
    this.tx_backup = null;
    this.tx_withdraw = null;
    this.smt_proof = null;
    this.confirmed = false
    this.spent = false
  }

  // Get data to display in GUI
  getDisplayInfo() {
    return {
      shared_key_id: this.shared_key_id,
      value: this.value,
      funding_txid: this.funding_txid,
      timestamp: this.timestamp,
      swap_rounds: this.swap_rounds
    }
  };

  // Generate BTC address from SharedKey
  async getBtcAddress(wasm_client: any, network: Network) {
    let pub_key = wasm_client.curv_ge_to_bitcoin_public_key(
      JSON.stringify(
        this.shared_key.public.q
      )
    );
    return pubKeyTobtcAddr(pub_key, network)
  }
}


export interface PrepareSignTxMsg {

}

export interface InclusionProofSMT {

}
