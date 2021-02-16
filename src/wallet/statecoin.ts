// Statecoin is a Mercury shared key along with all deposit information.

import { Network } from "bitcoinjs-lib";
import { Transaction as BTCTransaction } from "bitcoinjs-lib/types/transaction";
import { ACTION } from ".";
import { MasterKey2 } from "./mercury/ecdsa"
import { decodeSecp256k1Point, pubKeyTobtcAddr } from "./util";

export class StateCoinList {
  coins: StateCoin[]

  constructor() {
    this.coins = [];
  }

  static fromJSON(coins_json: StateCoinList): StateCoinList {
    let statecoins = new StateCoinList()
    coins_json.coins.forEach((item: StateCoin) => {
      let coin = new StateCoin(item.shared_key_id, item.shared_key);
      statecoins.coins.push(Object.assign(coin, item))
    })
    return statecoins
  }

  getAllCoins(block_height: number) {
    return this.coins.map((item: StateCoin) => {
      return item.getDisplayInfo(block_height)
    })
  };

  getUnspentCoins(block_height: number) {
    let total = 0
    let coins = this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.AVAILABLE) {
        total += item.value
        return item
      }
      return
    })
    return [coins.map((item: StateCoin) => item.getDisplayInfo(block_height)), total]
  };

  getUnconfirmedCoins(network: Network) {
    let coins = this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.UNCOMFIRMED) {
        return item
      }
      return
    })
    return coins.map((item: StateCoin) => item.getFundingTxInfo(network))
  };

  getCoin(shared_key_id: string): StateCoin | undefined {
    return this.coins.reverse().find(coin => coin.shared_key_id === shared_key_id)
  }

  // creates new coin with Date.now()
  addNewCoin(shared_key_id: string, shared_key: MasterKey2) {
    this.coins.push(new StateCoin(shared_key_id, shared_key))
  };
  // Add already constructed statecoin
  addCoin(statecoin: StateCoin) {
    this.coins.push(statecoin)
  };


  setCoinSpent(shared_key_id: string, action: string) {
    let coin = this.getCoin(shared_key_id)
    if (coin) {
      switch (action) {
        case ACTION.WITHDRAW:
          coin.setWithdrawn();
          return;
        case ACTION.TRANSFER:
          coin.setSpent();
          return;
        case ACTION.SWAP:
          coin.setSwapped();
          return;
      }
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }

  setCoinFinalized(finalized_statecoin: StateCoin) {
    let statecoin = this.getCoin(finalized_statecoin.shared_key_id)
    // TODO: do some checks here
    if (statecoin) {
      statecoin = finalized_statecoin
    } else {
      throw Error("No coin found with shared_key_id " + finalized_statecoin.shared_key_id);
    }
  }

  setCoinWithdrawTx(shared_key_id: string, tx_withdraw: BTCTransaction) {
    let coin = this.getCoin(shared_key_id)
    if (coin) {
      coin.tx_withdraw = tx_withdraw
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }
}

// STATUS represent each stage in the lifecycle of a statecoin.
export const STATECOIN_STATUS = {
  // UNCOMFIRMED coins are awaiting confirmation of their funding transaction
  UNCOMFIRMED: "UNCOMFIRMED",
  // Coins are fully owned by wallet and unspent
  AVAILABLE: "AVAILABLE",
  // Coin used to belonged to wallet but has been transferred
  SPENT: "SPENT",
  // Coin used to belonged to wallet but has been withdraw
  WITHDRAWN: "WITHDRAWN",
  // Coin used to belonged to wallet but has been swapped
  SWAPPED: "SWAPPED",
  // Coin has performed transfer_sender and has valid TransferMsg3 to be claimed by receiver
  SPEND_PENDING: "SPEND_PENDING",
};
Object.freeze(STATECOIN_STATUS);

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
  status: string;

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
    this.status = STATECOIN_STATUS.UNCOMFIRMED;
  }

  setConfirmed() { this.status = STATECOIN_STATUS.AVAILABLE }
  setSpent() { this.status = STATECOIN_STATUS.SPENT; }
  setWithdrawn() { this.status = STATECOIN_STATUS.WITHDRAWN; }
  setSwapped() { this.status = STATECOIN_STATUS.SWAPPED; }
  setSpendPending() { this.status = STATECOIN_STATUS.SPEND_PENDING; }

  // Get data to display in GUI
  getDisplayInfo(block_height: number): StateCoinDisplayData {
    return {
      shared_key_id: this.shared_key_id,
      value: this.value,
      funding_txid: this.funding_txid,
      timestamp: this.timestamp,
      swap_rounds: this.swap_rounds,
      expiry_data: this.getExpiryData(block_height)
    }
  };

  getFundingTxInfo(network: Network) {
    return {
      shared_key_id: this.shared_key_id,
      value: this.value,
      funding_txid: this.funding_txid,
      p_addr: this.getBtcAddress(network)
    }
  }

  getBackupTxData(block_height: number) {
    return {
      tx_backup_hex: this.tx_backup?.toHex(),
      priv_key_hex: "",
      key_wif: "",
      expiry_data: this.getExpiryData(block_height)
    }
  }

  // Calculate blocks and rough days/months until expiry
  getExpiryData(block_height: number): ExpiryData {
    if (this.tx_backup==null) throw Error("Cannot calculate expiry - Coin is not confirmed.");
    let blocks_to_locktime = this.tx_backup.locktime - block_height;
    if (blocks_to_locktime<=0) return {blocks: 0, days: 0, months: 0};
    let days_to_locktime = Math.floor(blocks_to_locktime / (6*24))

    return {
      blocks: blocks_to_locktime,
      days: days_to_locktime,
      months: Math.floor(days_to_locktime/30)
    }
  }

  // Get BTC address from SharedKey
  getBtcAddress(network: Network): string {
    let pub_key = this.getSharedPubKey()
    return pubKeyTobtcAddr(pub_key, network)
  }

  // Get public key from SharedKey
  getSharedPubKey(): string {
    return decodeSecp256k1Point(this.shared_key.public.q).encodeCompressed("hex");
  }


}

export interface StateCoinDisplayData {
  shared_key_id: string,
  value: number,
  funding_txid: string,
  timestamp: number,
  swap_rounds: number,
  expiry_data: ExpiryData
}

export interface ExpiryData {
  blocks: number,
  days: number,
  months: number
}


export interface InclusionProofSMT {

}
