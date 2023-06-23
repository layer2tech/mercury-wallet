// Statecoin is a Mercury shared key along with all deposit information.

"use strict";
import { Network, Transaction } from "bitcoinjs-lib";
import { Transaction as BTCTransaction } from "bitcoinjs-lib/types/transaction";
import { ACTION } from ".";
import { ElectrumTxData } from "../wallet/electrum";
import { MasterKey2 } from "./mercury/ecdsa";
import { decodeSecp256k1Point, pubKeyTobtcAddr } from "./util";
import {
  BatchData,
  BSTRequestorData,
  StatechainID,
  SwapErrorMsg,
  SwapID,
  SwapInfo,
  SWAP_STATUS,
} from "./swap/swap_utils";
import {
  SCEAddress,
  TransferFinalizeData,
  TransferMsg3,
  TransferMsg4,
} from "./mercury/transfer";
import { WithdrawMsg2 } from "./mercury/withdraw";
import WrappedLogger from "../wrapped_logger";

// Logger import.
// Node friendly importing required for Jest tests.
declare const window: any;
let log: any;
log = new WrappedLogger();

export const HIDDEN = "*****";

export class StateCoinList {
  coins: StateCoin[];

  constructor() {
    this.coins = [];
  }

  static fromJSON(sclist_json: StateCoinList): StateCoinList {
    return StateCoinList.fromCoinsArray(sclist_json.coins);
  }

  static fromCoinsArray(coins: StateCoin[]): StateCoinList {
    let statecoinsList = new StateCoinList();

    coins.forEach((itemCoin: StateCoin) => {
      let item = { ...itemCoin };
      let coin = new StateCoin(item.shared_key_id, item.shared_key);
      coin.wallet_version = "";

      let replca = false;
      statecoinsList.coins.filter((existing_coin: StateCoin) => {
        if (
          item.shared_key_id === existing_coin.shared_key_id &&
          item.status === STATECOIN_STATUS.AVAILABLE &&
          existing_coin.status === STATECOIN_STATUS.AVAILABLE
        ) {
          replca = true;
        }
      });

      // re-build tx_backup as Transaction
      if (item.tx_backup !== undefined && item.tx_backup !== null) {
        let tx_backup_any: any = item.tx_backup;
        let tx_backup = new Transaction();
        tx_backup.version = tx_backup_any.version;
        tx_backup.locktime = tx_backup_any.locktime;
        if (tx_backup_any.ins.length > 0) {
          if (Array.isArray(tx_backup_any.ins[0].hash.data)) {
            tx_backup.addInput(
              Buffer.from(tx_backup_any.ins[0].hash),
              tx_backup_any.ins[0].index,
              tx_backup_any.ins[0].sequence
            );
            if (tx_backup_any.ins[0].witness.length > 0) {
              tx_backup.ins[0].witness = [
                Buffer.from(tx_backup_any.ins[0].witness[0]),
                Buffer.from(tx_backup_any.ins[0].witness[1]),
              ];
            }
          } else {
            tx_backup.addInput(
              Buffer.from(Object.values(tx_backup_any.ins[0].hash as object)),
              tx_backup_any.ins[0].index,
              tx_backup_any.ins[0].sequence
            );
            if (tx_backup_any.ins[0].witness.length > 0) {
              tx_backup.ins[0].witness = [
                Buffer.from(
                  Object.values(tx_backup_any.ins[0].witness[0] as object)
                ),
                Buffer.from(
                  Object.values(tx_backup_any.ins[0].witness[1] as object)
                ),
              ];
            }
          }
        }
        if (tx_backup_any.outs.length > 0) {
          if (Array.isArray(tx_backup_any.outs[0].script.data)) {
            tx_backup.addOutput(
              Buffer.from(tx_backup_any.outs[0].script),
              tx_backup_any.outs[0].value
            );
            tx_backup.addOutput(
              Buffer.from(tx_backup_any.outs[1].script),
              tx_backup_any.outs[1].value
            );
          } else {
            tx_backup.addOutput(
              Buffer.from(
                Object.values(tx_backup_any.outs[0].script as object)
              ),
              tx_backup_any.outs[0].value
            );
            tx_backup.addOutput(
              Buffer.from(
                Object.values(tx_backup_any.outs[1].script as object)
              ),
              tx_backup_any.outs[1].value
            );
          }
        }
        item.tx_backup = tx_backup;
      }

      // re-build tx_cpfp as Transaction
      if (item.tx_cpfp !== undefined && item.tx_cpfp !== null) {
        let tx_cpfp_any: any = item.tx_cpfp;
        let tx_cpfp = new Transaction();
        tx_cpfp.version = tx_cpfp_any.version;
        tx_cpfp.locktime = tx_cpfp_any.locktime;

        if (tx_cpfp_any.ins.length > 0) {

          if (Array.isArray(tx_cpfp_any.ins[0].hash.data)) {
            tx_cpfp.addInput(
              Buffer.from(tx_cpfp_any.ins[0].hash),
              tx_cpfp_any.ins[0].index,
              tx_cpfp_any.ins[0].sequence
            );
            if (tx_cpfp_any.ins[0].witness.length > 0) {
              tx_cpfp.ins[0].witness = [
                Buffer.from(tx_cpfp_any.ins[0].witness[0]),
                Buffer.from(tx_cpfp_any.ins[0].witness[1]),
              ];
            }
          } else {
            tx_cpfp.addInput(
              Buffer.from(Object.values(tx_cpfp_any.ins[0].hash as object)),
              tx_cpfp_any.ins[0].index,
              tx_cpfp_any.ins[0].sequence
            );
            if (tx_cpfp_any.ins[0].witness.length > 0) {
              tx_cpfp.ins[0].witness = [
                Buffer.from(
                  Object.values(tx_cpfp_any.ins[0].witness[0] as object)
                ),
                Buffer.from(
                  Object.values(tx_cpfp_any.ins[0].witness[1] as object)
                ),
              ];
            }
          }
        }

        if (tx_cpfp_any.outs.length > 0) {
          if (Array.isArray(tx_cpfp_any.outs[0].script.data)) {
            tx_cpfp.addOutput(
              Buffer.from(tx_cpfp_any.outs[0].script),
              tx_cpfp_any.outs[0].value
            );
          } else {
            tx_cpfp.addOutput(
              Buffer.from(
                Object.values(tx_cpfp_any.outs[0].script as object)
              ),
              tx_cpfp_any.outs[0].value
            );
          }
        }
        console.log(tx_cpfp);
        item.tx_cpfp = tx_cpfp;
      }

      // reset backup_confirm on restart
      if (item.tx_backup == null && item.backup_confirm) {
        item.backup_confirm = false
      }

      if (!replca) statecoinsList.coins.push(Object.assign(coin, item));
    });

    return statecoinsList;
  }

  getAllCoins(block_height: number) {
    return this.coins.map((item: StateCoin) => {
      return item.getDisplayInfo(block_height);
    });
  }

  getStatechainIdSet(): Set<string> {
    let result = new Set<string>();
    this.coins.forEach((item: StateCoin) => {
      result.add(item.statechain_id);
    });
    return result;
  }

  getUnspentCoins(block_height: number) {
    let total = 0;
    let coins = this.coins.filter((item: StateCoin) => {
      if (
        item.status === STATECOIN_STATUS.AVAILABLE ||
        item.status === STATECOIN_STATUS.IN_SWAP ||
        item.status === STATECOIN_STATUS.AWAITING_SWAP ||
        item.status === STATECOIN_STATUS.IN_TRANSFER ||
        item.status === STATECOIN_STATUS.WITHDRAWN ||
        item.status === STATECOIN_STATUS.WITHDRAWING ||
        item.status === STATECOIN_STATUS.SWAPLIMIT ||
        item.status === STATECOIN_STATUS.EXPIRED ||
        item.status === STATECOIN_STATUS.DUPLICATE
      ) {
        // Add all but withdrawn or awaiting withdrawal coins to total balance
        if (
          item.status !== STATECOIN_STATUS.WITHDRAWN &&
          item.status !== STATECOIN_STATUS.WITHDRAWING &&
          item.status !== STATECOIN_STATUS.IN_TRANSFER &&
          item.status !== STATECOIN_STATUS.EXPIRED &&
          item.status !== STATECOIN_STATUS.DUPLICATE
        ) {
          total += item.value;
        }
        return item;
      }
      return null;
    });
    return [
      coins.map((item: StateCoin) => item.getDisplayInfo(block_height)),
      total,
    ];
  }

  // Return coins that are awaiting funding tx to be broadcast
  getInitialisedCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.INITIALISED) {
        return item;
      }
      return null;
    });
  }

  // Return coins that are awaiting funding tx confirmations
  getInMempoolCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.IN_MEMPOOL) {
        return item;
      }
      return null;
    });
  }

  // Find all coins in mempool or mined but with required_confirmations confirmations
  getUnconfirmedCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (
        item.status === STATECOIN_STATUS.UNCONFIRMED ||
        item.status === STATECOIN_STATUS.IN_MEMPOOL ||
        item.status === STATECOIN_STATUS.INITIALISED
      ) {
        return item;
      }
      return null;
    });
  }

  getWithdrawingCoins() {
    return this.coins.filter((item: StateCoin) => {
      if (item.status === STATECOIN_STATUS.WITHDRAWING) {
        return item;
      }
      return null;
    });
  }

  getCoin(shared_key_id: string): StateCoin | undefined {
    // return first available coin, if no then first matching coin
    let coin_arr = this.coins.filter(
      (coin) => coin.shared_key_id === shared_key_id
    );
    if (coin_arr.length > 0) {
      let avail_coin = coin_arr.find(
        (coin) => coin.status === STATECOIN_STATUS.AVAILABLE
      );
      if (avail_coin) {
        return avail_coin;
      } else {
        return coin_arr[0];
      }
    } else {
      return undefined;
    }
  }

  getCoins(statechain_id: string) {
    return this.coins.filter((item: StateCoin) => {
      if (item.statechain_id === statechain_id) {
        return item;
      }
      return null;
    });
  }

  // creates new coin with Date.now()
  addNewCoin(shared_key_id: string, shared_key: MasterKey2) {
    let existing_coin = this.getCoin(shared_key_id);
    if (existing_coin) {
      console.log("Repeated coin - shared_key_id: " + shared_key_id);
      existing_coin.status = STATECOIN_STATUS.IN_TRANSFER;
    }
    this.coins.push(new StateCoin(shared_key_id, shared_key));
    return true;
  }

  // Add already constructed statecoin
  addCoin(statecoin: StateCoin) {
    let existing_coin = this.getCoin(statecoin.shared_key_id);
    if (existing_coin) {
      console.log("Repeated coin - shared_key_id: " + statecoin.shared_key_id);
      existing_coin.status = STATECOIN_STATUS.IN_TRANSFER;
    }
    this.coins.push(statecoin);
    return true;
  }

  // Remove coin from list
  removeCoin(shared_key_id: string, testing_mode: boolean) {
    const new_coins = this.coins.filter((item) => {
      if (item.shared_key_id !== shared_key_id) {
        return true;
      }
      if (item.status !== STATECOIN_STATUS.INITIALISED && !testing_mode) {
        throw Error(
          "Should not remove coin whose funding transaction has been broadcast."
        );
      }
      return false;
    });
    this.coins = new_coins;
  }

  setAutoSwap(shared_key_id: string) {
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      coin.setAutoSwap(true);
    }
  }

  setCoinSpent(
    shared_key_id: string,
    action: string,
    transfer_msg?: TransferMsg3
  ) {
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      switch (action) {
        case ACTION.WITHDRAW:
          coin.setWithdrawn();
          return;
        case ACTION.TRANSFER:
          coin.setInTransfer();
          coin.transfer_msg = transfer_msg!;
          return;
        case ACTION.SWAP:
          coin.setSwapped();
          return;
        case ACTION.EXPIRED:
          coin.setExpired();
      }
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }

  // Funding Tx seen on network. Set coin status and funding_txid
  // Return true if the function call resulted in a change to the coin
  setCoinInMempool(shared_key_id: string, funding_tx_data: ElectrumTxData) {
    let changed = false;
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      changed = coin.setInMempool();
      if (coin.funding_txid !== funding_tx_data.tx_hash) {
        coin.funding_txid = funding_tx_data.tx_hash;
        changed = true;
      }
      if (coin.funding_vout !== funding_tx_data.tx_pos) {
        coin.funding_vout = funding_tx_data.tx_pos;
        changed = true;
      }
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
    return changed;
  }

  // Funding Tx mined. Set coin status and block height
  setCoinUnconfirmed(shared_key_id: string, funding_tx_data: ElectrumTxData) {
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      coin.setUnconfirmed();
      coin.block = funding_tx_data.height;
      if (coin.funding_txid === "") {
        // May have missed setCoinInMempool call.
        coin.funding_txid = funding_tx_data.tx_hash;
        coin.funding_vout = funding_tx_data.tx_pos;
      }
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }

  setConfirmingBackup(shared_key_id: string) {
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      coin.backup_confirm = true;
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }

  setCoinFinalized(finalized_statecoin: StateCoin) {
    let statecoin = this.getCoin(finalized_statecoin.shared_key_id);
    // TODO: do some checks here
    if (statecoin) {
      statecoin = finalized_statecoin;
    } else {
      throw Error(
        "No coin found with shared_key_id " + finalized_statecoin.shared_key_id
      );
    }
  }

  setCoinWithdrawTxId(shared_key_id: string, withdraw_txid: string) {
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      let tx_info: WithdrawalTxBroadcastInfo =
        coin.getWithdrawalBroadcastTxInfo(withdraw_txid);
      let tx: BTCTransaction = tx_info.tx;
      if (tx_info) {
        coin.tx_withdraw = tx;
        coin.tx_hex = tx_info.tx_hex;
        coin.status = STATECOIN_STATUS.WITHDRAWN;
        coin.withdraw_txid = withdraw_txid;
      } else {
        throw Error("No withdrawal broadcast found with id " + withdraw_txid);
      }
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }

  setCoinWithdrawBroadcastTx(
    shared_key_id: string,
    tx_withdraw: BTCTransaction,
    tx_fee: number,
    withdraw_msg_2: WithdrawMsg2,
    rec_addr: string
  ) {
    console.log("getting coin...");
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      coin.tx_withdraw_broadcast.push(
        new WithdrawalTxBroadcastInfo(
          tx_fee,
          tx_withdraw,
          withdraw_msg_2,
          rec_addr
        )
      );
      return;
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }

  removeCoinFromSwapPool(shared_key_id: string, force: boolean = false) {
    this.removeCoinFromSwapPoolUnchecked(
      this.checkRemoveCoinFromSwapPool(shared_key_id, force)
    );
  }

  removeCoinFromSwapPoolUnchecked(coin: StateCoin) {
    coin.setSwapDataToNull();
  }

  checkRemoveCoinFromSwapPool(
    shared_key_id: string,
    force: boolean = false
  ): StateCoin {
    let coin = this.getCoin(shared_key_id);
    if (coin) {
      if (coin.status !== STATECOIN_STATUS.AWAITING_SWAP)
        throw Error(`Coin is not in a swap pool.`);
      return coin;
    } else {
      throw Error("No coin found with shared_key_id " + shared_key_id);
    }
  }
}

// STATUS represent each stage in the lifecycle of a statecoin.
export enum STATECOIN_STATUS {
  // INITIALISED coins are awaiting their funding transaction to appear in the mempool
  INITIALISED = "INITIALISED",
  // IN_MEMPOOL funding transaction in the mempool
  IN_MEMPOOL = "IN_MEMPOOL",
  // UNCONFIRMED coins are awaiting more confirmations on their funding transaction
  UNCONFIRMED = "UNCONFIRMED",
  // Coins are fully owned by wallet and unspent
  AVAILABLE = "AVAILABLE",
  // Coin has been sent but not yet received.
  IN_TRANSFER = "IN_TRANSFER",
  // Coin currently waiting in swap pool
  AWAITING_SWAP = "AWAITING_SWAP",
  // Coin currently carrying out swap protocol
  IN_SWAP = "IN_SWAP",
  // Coin used to belonged to wallet but has been transferred
  SPENT = "SPENT",
  // A withdrawal transaction has been broadcast but has not yet been confirmed
  WITHDRAWING = "WITHDRAWING",
  // Coin used to belonged to wallet but has been withdraw
  WITHDRAWN = "WITHDRAWN",
  // Coin used to belonged to wallet but has been swapped
  SWAPPED = "SWAPPED",
  // Coin has performed transfer_sender and has valid TransferMsg3 to be claimed by receiver
  SPEND_PENDING = "SPEND_PENDING",
  // Coin has reached it's backup timelock and has been spent
  EXPIRED = "EXPIRED",
  // Coin has reached the locktime limit for inclusion in swap_status
  SWAPLIMIT = "SWAPLIMIT",
  // Coin has been deleted
  DELETED = "DELETED",
  // Duplicate deposit to single shared key
  DUPLICATE = "DUPLICATE",
}
Object.freeze(STATECOIN_STATUS);

// BACKUP_STATUS represent each stage in the lifecycle of the backup.
export const BACKUP_STATUS = {
  // PRE_LOCKTIME backup transactions are not valid yet as block_height < nLocktime
  PRE_LOCKTIME: "Not Final",
  // UNBROADCAST are valid transactions (block_height >= nLocktime) yet to be broadcast
  UNBROADCAST: "Unbroadcast",
  // IN_MEMPOOL backup transactions are accepted into the mempool
  IN_MEMPOOL: "In mempool",
  // CONFIRMED backup transactions are included in a block, but as yet unspent
  CONFIRMED: "Confirmed",
  // POST_INTERVAL backup transactions are not yet confirmed, but the previous owner nLocktime <= block_height
  POST_INTERVAL: "Interval elapsed",
  // TAKEN backup transactions have failed to confirm in time and the output has been spent by a previous owner
  TAKEN: "Output taken",
  // SPENT backup transactions have been spent to a specified address
  SPENT: "Spent",
  // MISSING correct backup tx not recovered
  MISSING: "Missing",
  // BELOW_MIN_FEE
  BELOW_MIN_FEE: "Minimum fee not met"
};
Object.freeze(BACKUP_STATUS);

//A withdrawal transaction the has been broadcast
export class WithdrawalTxBroadcastInfo {
  tx_fee: number;
  tx: BTCTransaction;
  txid: string;
  tx_hex: string;
  withdraw_msg_2: WithdrawMsg2;
  rec_addr: string;

  constructor(
    tx_fee: number,
    tx: BTCTransaction,
    withdraw_msg_2: WithdrawMsg2,
    rec_addr: string
  ) {
    this.tx_fee = tx_fee;
    this.tx = tx;
    this.txid = tx.getId();
    this.tx_hex = tx.toHex();
    this.withdraw_msg_2 = withdraw_msg_2;
    this.rec_addr = rec_addr;
  }
}

// Each individual StateCoin
export class StateCoin {
  shared_key_id: string; // SharedKeyId
  statechain_id: string; // StateChainId
  shared_key: MasterKey2;
  wallet_version: string;
  proof_key: string;
  value: number;
  description: string;
  funding_txid: string;
  funding_vout: number;
  sc_address: string; //StateCoin Address
  block: number; // included in block number. 0 for unconfirmed.
  timestamp: number;
  tx_backup: BTCTransaction | null;
  backup_status: string;
  backup_confirm: boolean;
  init_locktime: number | null;
  interval: number;
  tx_cpfp: BTCTransaction | null;
  //Confirmed withdrawal transaction
  tx_withdraw: BTCTransaction | null;
  //Broadcasted withdrawal transactions
  tx_withdraw_broadcast: WithdrawalTxBroadcastInfo[];
  withdraw_txid: string | null;
  tx_hex: string | null;
  smt_proof: InclusionProofSMT | null;
  swap_rounds: number;
  anon_set: number;
  is_new: boolean;
  is_deposited: boolean;
  status: string;

  // Transfer data
  transfer_msg: TransferMsg3 | null;

  // Swap data
  swap_status: string | null;
  ui_swap_status: string | null;
  swap_id: SwapID | null;
  swap_info: SwapInfo | null;
  swap_address: SCEAddress | null;
  swap_my_bst_data: BSTRequestorData | null;
  swap_receiver_addr: SCEAddress | null;
  swap_transfer_msg: TransferMsg3 | null;
  swap_batch_data: BatchData | null;
  swap_transfer_msg_4: TransferMsg4 | null;
  swap_transfer_msg_3_receiver: TransferMsg3 | null;
  swap_transfer_finalized_data: TransferFinalizeData | null;
  swap_auto: boolean;
  swap_error: SwapErrorMsg | null;

  constructor(shared_key_id: string, shared_key: MasterKey2) {
    this.shared_key_id = shared_key_id;
    this.statechain_id = "";
    this.shared_key = shared_key;
    this.wallet_version = require("../../package.json").version;
    this.proof_key = "";
    this.value = 0;
    this.description = "";
    this.timestamp = new Date().getTime();

    this.funding_txid = "";
    this.funding_vout = 0;
    this.sc_address = ""; //deposited StateCoin address
    this.block = -1; // marks tx has not been mined
    this.swap_rounds = 0;
    this.anon_set = 0;
    this.is_new = false;
    this.is_deposited = false;
    //this.swap_participants = 0
    this.tx_backup = null;
    this.backup_status = BACKUP_STATUS.PRE_LOCKTIME;
    this.backup_confirm = false;
    this.init_locktime = null;
    this.interval = 1;
    this.tx_cpfp = null;
    this.tx_withdraw = null;
    this.tx_withdraw_broadcast = [];
    this.withdraw_txid = null;
    this.tx_hex = null;
    this.smt_proof = null;
    this.status = STATECOIN_STATUS.INITIALISED;

    this.transfer_msg = null;

    this.swap_status = null;
    this.ui_swap_status = null;
    this.swap_id = null;
    this.swap_address = null;
    this.swap_info = null;
    this.swap_my_bst_data = null;
    this.swap_receiver_addr = null;
    this.swap_transfer_msg = null;
    this.swap_batch_data = null;
    this.swap_transfer_msg_3_receiver = null;
    this.swap_transfer_msg_4 = null;
    this.swap_auto = false;
    this.swap_error = null;
    this.swap_transfer_finalized_data = null;
  }

  static fromJSON(statecoin: StateCoin): StateCoin {
    return StateCoinList.fromCoinsArray([statecoin]).coins[0];
  }

  setAutoSwap(val: boolean) {
    this.swap_auto = val;
  }
  setSwapError(swap_error: SwapErrorMsg) {
    this.swap_error = swap_error;
  }
  clearSwapError() {
    this.swap_error = null;
  }
  setInMempool(): boolean {
    if (this.status !== STATECOIN_STATUS.IN_MEMPOOL) {
      this.status = STATECOIN_STATUS.IN_MEMPOOL;
      return true;
    }
    return false;
  }
  setUnconfirmed() {
    this.status = STATECOIN_STATUS.UNCONFIRMED;
  }
  setConfirmed() {
    this.status = STATECOIN_STATUS.AVAILABLE;
  }
  setAwaitingSwap() {
    this.status = STATECOIN_STATUS.AWAITING_SWAP;
  }
  setInSwap() {
    this.status = STATECOIN_STATUS.IN_SWAP;
  }
  setInTransfer() {
    this.status = STATECOIN_STATUS.IN_TRANSFER;
  }
  setSpent() {
    this.status = STATECOIN_STATUS.SPENT;
  }
  setWithdrawn() {
    this.status = STATECOIN_STATUS.WITHDRAWN;
  }
  setWithdrawing() {
    this.status = STATECOIN_STATUS.WITHDRAWING;
  }
  setSwapped() {
    this.status = STATECOIN_STATUS.SWAPPED;
  }
  setSpendPending() {
    this.status = STATECOIN_STATUS.SPEND_PENDING;
  }
  setExpired() {
    this.status = STATECOIN_STATUS.EXPIRED;
  }
  setSwapLimit() {
    this.status = STATECOIN_STATUS.SWAPLIMIT;
  }

  setBackupPreLocktime() {
    this.backup_status = BACKUP_STATUS.PRE_LOCKTIME;
  }
  setBackupUnbroadcast() {
    this.backup_status = BACKUP_STATUS.UNBROADCAST;
  }
  setBackupInMempool() {
    this.backup_status = BACKUP_STATUS.IN_MEMPOOL;
  }
  setBackupConfirmed() {
    this.backup_status = BACKUP_STATUS.CONFIRMED;
  }
  setBackupPostInterval() {
    this.backup_status = BACKUP_STATUS.POST_INTERVAL;
  }
  setBackupTaken() {
    this.backup_status = BACKUP_STATUS.TAKEN;
  }
  setBackupSpent() {
    this.backup_status = BACKUP_STATUS.SPENT;
  }
  setBackupBelowMinFee() {
    this.backup_status = BACKUP_STATUS.BELOW_MIN_FEE;
  }  

  getWithdrawalBroadcastTxInfo(id: string): WithdrawalTxBroadcastInfo {
    let found = this.tx_withdraw_broadcast.filter(
      (item: WithdrawalTxBroadcastInfo) => {
        if (item.txid === id) {
          return item;
        }
        return null;
      }
    );
    return found[0];
  }

  getWithdrawalMaxTxFee(): number {
    let fee_max = -1;
    for (let i = 0; i < this.tx_withdraw_broadcast.length; i++) {
      let fee = this.tx_withdraw_broadcast[i].tx_fee;
      fee_max = fee > fee_max ? fee : fee_max;
    }
    return fee_max;
  }

  validateSwap() {
    if (this.swap_status === SWAP_STATUS.Phase4)
      throw Error(
        `Coin ${this.shared_key_id} is in swap phase 4. Swap must be resumed.`
      );
    if (this.status === STATECOIN_STATUS.AWAITING_SWAP)
      throw Error("Coin " + this?.getTXIdAndOut() + " already in swap pool.");
    if (this.status === STATECOIN_STATUS.IN_SWAP)
      throw Error(
        "Coin " + this?.getTXIdAndOut() + " already involved in swap."
      );
    if (this.status !== STATECOIN_STATUS.AVAILABLE)
      throw Error("Coin " + this?.getTXIdAndOut() + " not available for swap.");
  }

  validateResumeSwap() {
    if (this.status !== STATECOIN_STATUS.IN_SWAP)
      throw Error(
        "Cannot resume coin " + this.shared_key_id + " - not in swap."
      );
    if (this.swap_status !== SWAP_STATUS.Phase4)
      throw Error(
        "Cannot resume coin " +
          this.shared_key_id +
          " - swap status: " +
          this.swap_status
      );
  }

  // Get data to display in GUI
  getDisplayInfo(block_height: number): StateCoinDisplayData {
    return {
      status: this.status,
      wallet_version: this.wallet_version,
      shared_key_id: this.shared_key_id,
      value: this.value,
      description: this.description,
      funding_txid: this.funding_txid,
      funding_vout: this.funding_vout,
      sc_address: this.sc_address,
      tx_hex: this.tx_hex,
      withdraw_txid: this.withdraw_txid,
      timestamp: this.timestamp,
      swap_rounds: this.swap_rounds,
      anon_set: this.anon_set,
      is_new: this.is_new,
      is_deposited: this.is_deposited,
      expiry_data: this.getExpiryData(block_height),
      transfer_msg: this.transfer_msg,
      swap_id: this.swap_info ? this.swap_info.swap_token.id : null,
      swap_status: this.swap_status,
      ui_swap_status: this.ui_swap_status,
      swap_auto: this.swap_auto,
      swap_error: this.swap_error,
    };
  }

  // Get data to display in GUI
  getSwapDisplayInfo(): SwapDisplayData | null {
    let si = this.swap_info;
    if (si === null) {
      return null;
    }

    return {
      swap_status: this.swap_status,
      swap_id: si.swap_token.id,
      participants: si.swap_token.statechain_ids.length,
      capacity: si.swap_token.statechain_ids.length,
      status: si.status,
    };
  }

  getConfirmations(block_height: number): number {
    switch (this.status) {
      case STATECOIN_STATUS.INITIALISED:
        return -1;
      case STATECOIN_STATUS.IN_MEMPOOL:
        return 0;
      default:
        return block_height - this.block + 1;
    }
  }

  getFundingTxInfo(network: Network, block_height: number) {
    return {
      shared_key_id: this.shared_key_id,
      value: this.value,
      funding_txid: this.funding_txid,
      funding_vout: this.funding_vout,
      p_addr: this.getBtcAddress(network),
      confirmations: this.getConfirmations(block_height),
    };
  }

  getBackupTxData(block_height: number) {
    if (this.backup_status === BACKUP_STATUS.MISSING) {
      return {
        tx_backup_hex: "",
        priv_key_hex: "",
        key_wif: "",
        expiry_data: 0,
        backup_status: this.backup_status,
        txid: "None",
        output_value: this.value,
        cpfp_status: "Disabled",
      };
    }

    if (this.tx_backup == null) throw Error("null");

    return {
      tx_backup_hex: this.tx_backup.toHex(),
      priv_key_hex: "",
      key_wif: "",
      expiry_data: this.getExpiryData(block_height),
      backup_status: this.backup_status,
      txid: this.tx_backup.getId(),
      output_value: this.tx_backup.outs[0].value,
      cpfp_status: "None",
    };
  }

  // Calculate blocks and rough days/months until expiry
  // If not confirmed, send confirmation data instead.
  getExpiryData(block_height: number): ExpiryData {
    // If not confirmed, send confirmation data instead.
    if (this.tx_backup == null) {
      // Otherwise must be UNCONFIRMED so calculate number of confs
      return {
        blocks: -1,
        confirmations: this.getConfirmations(block_height),
        days: 0,
        months: 0,
      };
    }
    let blocks_to_locktime = this.tx_backup.locktime - block_height;
    if (blocks_to_locktime <= 0)
      return { blocks: 0, days: 0, months: 0, confirmations: 0 };
    let days_to_locktime = Math.floor(blocks_to_locktime / (6 * 24));
    return {
      blocks: blocks_to_locktime,
      days: days_to_locktime,
      months: Math.floor(days_to_locktime / 30),
      confirmations: this.getConfirmations(block_height),
    };
  }

  // Get BTC address from SharedKey
  getBtcAddress(network: Network): string {
    let pub_key = this.getSharedPubKey();
    return pubKeyTobtcAddr(pub_key, network);
  }

  // Get public key from SharedKey
  getSharedPubKey(): string {
    return decodeSecp256k1Point(this.shared_key.public.q).encodeCompressed(
      "hex"
    );
  }

  // Set all StateCoin swap data to null.
  setSwapDataToNull(delete_swap_transfer_finalized_data: boolean = true) {
    this.setConfirmed();
    this.swap_status = null;
    this.swap_id = null;
    this.swap_address = null;
    this.swap_info = null;
    this.swap_my_bst_data = null;
    this.swap_receiver_addr = null;
    this.swap_transfer_msg = null;
    this.swap_batch_data = null;
    this.swap_transfer_msg_3_receiver = null;
    this.swap_transfer_msg_4 = null;
    this.ui_swap_status = null;
    this.clearSwapError();
    if (delete_swap_transfer_finalized_data) {
      this.swap_transfer_finalized_data = null;
    }
  }

  getTXIdAndOut(): string {
    return this.funding_txid + ":" + this.funding_vout;
  }
}

export interface StateCoinDisplayData {
  wallet_version: string;
  shared_key_id: string;
  value: number;
  description: string;
  funding_txid: string;
  funding_vout: number;
  sc_address: string;
  tx_hex: string | null;
  withdraw_txid: string | null;
  timestamp: number;
  swap_rounds: number;
  anon_set: number;
  is_new: boolean;
  is_deposited: boolean;
  expiry_data: ExpiryData;
  status: string;
  transfer_msg: TransferMsg3 | null;
  swap_id: string | null;
  swap_status: string | null;
  ui_swap_status: string | null;
  swap_auto: boolean;
  swap_error: SwapErrorMsg | null;
}

export interface SwapDisplayData {
  swap_status: string | null;
  swap_id: string;
  participants: number;
  capacity: number;
  status: string;
}

export interface ExpiryData {
  blocks: number;
  days: number;
  months: number;
  confirmations: number;
}

export interface Token {
  id: string,
  btc: string,
  ln: string
}

export interface TokenData {
  token: Token,
  values: number[]
}


export interface InclusionProofSMT {

}
