// Statecoin is a Mercury shared key along with all deposit information.

import { Network } from "bitcoinjs-lib";
import { Transaction as BTCTransaction } from "bitcoinjs-lib/types/transaction";
import { ACTION } from ".";
import { ElectrumTxData } from "./electrum";
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
      return null
    })
    return [coins.map((item: StateCoin) => item.getDisplayInfo(block_height)), total]
  };

  // Return coins that are awaiting funding tx to be broadcast
  getInitialisedCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.INITIALISED) {
        return item
      }
      return null
    })
  };

  // Return coins that are awaiting funding tx confirmations
  getInMempoolCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.IN_MEMPOOL) {
        return item
      }
      return null
    })
  };

  // Find all coins in mempool or mined but with required_confirmations confirmations
  getUnconfirmedCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.UNCOMFIRMED || item.status === STATECOIN_STATUS.IN_MEMPOOL) {
        return item
      }
      return null
    })
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

  // Remove coin from list
  removeCoin(shared_key_id: string) {
    this.coins = this.coins.filter(item => {if (item.shared_key_id!==shared_key_id){return item}})
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

  // Funding Tx seen on network. Set coin status and funding_txid
  setCoinInMempool(shared_key_id: string, funding_tx_data: ElectrumTxData) {
    let coin = this.getCoin(shared_key_id)
    if (coin) {
      coin.setInMempool()
      coin.funding_txid = funding_tx_data.tx_hash
      coin.funding_vout = funding_tx_data.tx_pos
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }

  // Funding Tx mined. Set coin status and block height
  setCoinUnconfirmed(shared_key_id: string, funding_tx_data: ElectrumTxData) {
    let coin = this.getCoin(shared_key_id)
    if (coin) {
      coin.setUnconfirmed()
      coin.block = funding_tx_data.height
      if (coin.funding_txid==="") { // May have missed setCoinInMempool call.
        coin.funding_txid = funding_tx_data.tx_hash
        coin.funding_vout = funding_tx_data.tx_pos
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
  // INITIALISED coins are awaiting their funding transaction to appear in the mempool
  INITIALISED: "INITIALISED",
  // IN_MEMPOOL funding transaction in the mempool
  IN_MEMPOOL: "IN_MEMPOOL",
  // UNCOMFIRMED coins are awaiting more confirmations on their funding transaction
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
  funding_vout: number;
  block: number;  // included in block number. 0 for unconfirmed.
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
    this.funding_vout = 0;
    this.block = -1; // marks tx has not been mined
    this.swap_rounds = 0
    this.tx_backup = null;
    this.tx_withdraw = null;
    this.smt_proof = null;
    this.status = STATECOIN_STATUS.INITIALISED;
  }

  setInMempool() { this.status = STATECOIN_STATUS.IN_MEMPOOL }
  setUnconfirmed() { this.status = STATECOIN_STATUS.UNCOMFIRMED }
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
      funding_vout: this.funding_vout,
      timestamp: this.timestamp,
      swap_rounds: this.swap_rounds,
      expiry_data: this.getExpiryData(block_height),
      status: this.status
    }
  };

  getConfirmations(block_height: number): number {
    switch (this.status) {
      case (STATECOIN_STATUS.INITIALISED):
        return -1;
      case (STATECOIN_STATUS.IN_MEMPOOL):
        return 0;
      default:
        return block_height-this.block+1
    }
  }

  getFundingTxInfo(network: Network, block_height: number) {
    return {
      shared_key_id: this.shared_key_id,
      value: this.value,
      funding_txid: this.funding_txid,
      funding_vout: this.funding_vout,
      p_addr: this.getBtcAddress(network),
      confirmations: this.getConfirmations(block_height)
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
  // If not confirmed, send confirmation data instead.
  getExpiryData(block_height: number): ExpiryData {
    // If not confirmed, send confirmation data instead.
    if (this.tx_backup==null) {
      // Otherwise must be UNCOMFIRMED so calculate number of confs
      return {blocks:-1, confirmations: this.getConfirmations(block_height), days:0, months:0};
    }

    let blocks_to_locktime = this.tx_backup.locktime - block_height;
    if (blocks_to_locktime<=0) return {blocks: 0, days: 0, months: 0, confirmations: 0};
    let days_to_locktime = Math.floor(blocks_to_locktime / (6*24))

    return {
      blocks: blocks_to_locktime,
      days: days_to_locktime,
      months: Math.floor(days_to_locktime/30),
      confirmations: 0
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
  funding_vout: number,
  timestamp: number,
  swap_rounds: number,
  expiry_data: ExpiryData,
  status: string
}

export interface ExpiryData {
  blocks: number,
  days: number,
  months: number,
  confirmations: number
}


export interface InclusionProofSMT {

}
