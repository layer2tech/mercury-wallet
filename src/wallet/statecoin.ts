// Statecoin is a Mercury shared key along with all deposit information.

import { MasterKey2 } from "./mercury/ecdsa";

export class Statecoin {
  id: string;
  shared_key: any; // Should be MasterKey2. Left as any for ease in testing.
  value: number;
  txid: string;
  timestamp: number;
  swap_rounds: number

  constructor(id: string, shared_key: any, value: number, txid: string) {
    this.id = id;
    this.shared_key = shared_key;
    this.value = value;
    this.txid = txid;
    this.timestamp = new Date().getTime();
    this.swap_rounds = 0
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
