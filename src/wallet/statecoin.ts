// Statecoin is a Mercury shared key along with all deposit information.

import { MasterKey2 } from "./mercury/ecdsa";

export class Statecoins {
  coins: Coin[]

  constructor() {
    this.coins = [];
  }

  getAllCoins = () => {
    return this.coins.map((item: Coin) => {
      return item.getInfo()
    })
  };

  getUnspentCoins = () => {
    return this.coins.map((item: Coin) => {
      if (!item.spent) {
        return item.getInfo()
      }
    })
  };

  getCoin = (id: string) => {
    return this.coins.reverse().find(coin => coin.id == id)
  }


  addItem = (id: string, shared_key: MasterKey2, value: number, txid: string) => {
    this.coins.push(new Coin(id, shared_key, value, txid))
  };

  setCoinSpent = (id: string) => {
    let coin = this.getCoin(id)
    if (coin) {
      coin.spent = true
    } else {
      throw "No coin found with id " + id
    }
  }
}

export class Coin {
  id: string;
  shared_key: MasterKey2;
  value: number;
  txid: string;
  timestamp: number;
  swap_rounds: number;
  spent: boolean;

  constructor(id: string, shared_key: MasterKey2, value: number, txid: string) {
    this.id = id;
    this.shared_key = shared_key;
    this.value = value;
    this.txid = txid;
    this.timestamp = new Date().getTime();
    this.swap_rounds = 0
    this.spent = false
  }

  getInfo = () => {
    return {
      id: this.id,
      value: this.value,
      txid: this.txid,
      timestamp: this.timestamp,
      swap_rounds: this.swap_rounds
    }
  };
}
