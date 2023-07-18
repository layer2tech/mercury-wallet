import {
  Confirm,
  FilterInterface,
  OutPoint,
  TwoTuple_usizeTransactionZ,
  WatchedOutput,
} from "lightningdevkit";
import ElectrumClient from "../bitcoin_clients/ElectrumClient.mjs";
import TorClient from "../bitcoin_clients/TorClient.mjs";
import { FilterQueue, SyncState, newSyncState } from "./FilterQueue.js";
import { Mutex } from "async-mutex";
import { hexToUint8Array, uint8ArrayToHexString } from "../utils/utils.js";
import { Transaction } from "bitcoinjs-lib";
import { BitcoinDaemonClientInterface } from "../bitcoin_clients/BitcoinD.mjs";
import { InternalError, TxSyncError } from "./Error.js";

// Custom Logging
import { ChalkColor, Logger } from "../utils/Logger.js";
import chalk from "chalk";
const DEBUG = new Logger(ChalkColor.Magenta, "EsploraSyncClient.ts");

interface ConfirmedTx {
  txs: [[0, Transaction]];
  block_header: any;
  block_height: any;
  pos: number;
}

export default class EsploraSyncClient implements FilterInterface {
  bitcoind_client: ElectrumClient | TorClient;
  lock: Mutex;
  filter_queue: FilterQueue;
  sync_state!: SyncState;

  constructor(_bitcoind_client: any) {
    this.bitcoind_client = _bitcoind_client;
    this.filter_queue = new FilterQueue();
    this.lock = new Mutex();
    this.sync_state = newSyncState();
  }

  static from_client(bitcoind_client: BitcoinDaemonClientInterface) {
    return new EsploraSyncClient(bitcoind_client);
  }

  register_tx(txid: Uint8Array, script_pubkey: Uint8Array) {
    let tx_string = uint8ArrayToHexString(txid);
    let reversed_txid = this.reverse_txid(tx_string) ?? tx_string;

    this.lock.acquire().then((release) => {
      this.filter_queue.transactions.add(reversed_txid); // saved as hex string rather than uint8array
      release();
    });
  }

  register_output(output: WatchedOutput) {
    this.lock.acquire().then((release) => {
      this.filter_queue.outputs.set(output.get_outpoint(), output);
      release();
    });
  }

  async sync(confirmables: Confirm[]) {
    DEBUG.log("Starting transaction sync.", "sync");
    let tip_hash = await this.bitcoind_client.getBestBlockHash();
    let sync_state = this.sync_state; // Check this, no lock?

    while (true) {
      let pending_registrations = this.filter_queue.processQueues(sync_state);
      let tip_is_new = tip_hash !== sync_state.last_sync_hash;

      if (!sync_state.pending_sync && !pending_registrations && !tip_is_new) {
        DEBUG.log("Nothing to do. Exiting sync loop.", "sync");
        break;
      } else {
        if (tip_is_new) {
          DEBUG.log("if tip_is_new", "sync");
          try {
            let unconfirmed_txs = await this.get_unconfirmed_transactions(
              confirmables
            );
            let check_tip_hash = await this.bitcoind_client.getBestBlockHash();

            if (check_tip_hash !== tip_hash) {
              DEBUG.log("if check_tip_hash !== tip_hash -> continue", "sync");
              tip_hash = check_tip_hash;
              continue;
            }

            this.sync_unconfirmed_transactions(
              sync_state,
              confirmables,
              unconfirmed_txs
            );
          } catch (err) {
            // (Semi-)permanent failure, retry later.
            DEBUG.log("Failed during transaction sync, aborting.", "sync", err);
            sync_state.pending_sync = true;
            return new Error("" + err); // Check me
          }

          try {
            await this.sync_best_block_updated(confirmables, tip_hash);
          } catch (err) {
            if (
              err instanceof InternalError && // Check me
              err === InternalError.Inconsistency // Check me
            ) {
              // Immediately restart syncing when we encounter any inconsistencies.
              DEBUG.log(
                "Encountered inconsistency during transaction sync, restarting.",
                "sync"
              );
              sync_state.pending_sync = true;
              continue;
            } else {
              // (Semi-)permanent failure, retry later.
              sync_state.pending_sync = true;
              throw new Error("Sync Error" + err); // Check me
            }
          }
        }

        DEBUG.log("Continue", "sync");
        try {
          let confirmed_txs = await this.get_confirmed_transactions(sync_state);
          let check_tip_hash = await this.bitcoind_client.getBestBlockHash();

          if (check_tip_hash !== tip_hash) {
            tip_hash = check_tip_hash;
            continue;
          }

          this.sync_confirmed_transactions(
            sync_state,
            confirmables,
            confirmed_txs
          );
        } catch (err) {
          DEBUG.log("Failed during transaction sync, aborting.", "sync", err);
        }

        sync_state.last_sync_hash = tip_hash;
        sync_state.pending_sync = false;
      }
    }

    DEBUG.log("***** sync complete *****", "sync");
    return true;
  }

  async sync_best_block_updated(
    confirmables: Confirm[], // chainMonitor.asConfirm(), channelManager.asConfirm()
    tipHash: string //BlockHash
  ): Promise<void> {
    DEBUG.log("confirmables, tipHash", "sync_best_block_updated");

    // Inform the interface of the new block.
    const tipHeader = await this.bitcoind_client.getHeaderByHash(tipHash);
    const tipStatus = await this.bitcoind_client.getBlockStatus(tipHash);

    DEBUG.log("tipHeader->", "sync_best_block_updated", tipHeader);
    DEBUG.log("tipStatus->", "sync_best_block_updated", tipStatus);

    if (tipStatus.in_best_chain) {
      DEBUG.log("tipStatus.in_best_chain -> true", "sync_best_block_updated");
      if (tipStatus.height !== undefined) {
        DEBUG.log(
          "tipStatus.in_best_chain -> tipStatus.height !== undefined",
          "sync_best_block_updated"
        );
        confirmables.forEach((c) => {
          DEBUG.log(
            "c.best_block_updated(confirmables)",
            "sync_best_block_updated",
            hexToUint8Array(tipHeader) + " " + tipStatus.height
          );
          c.best_block_updated(hexToUint8Array(tipHeader), tipStatus.height);
        });
      }
    } else {
      DEBUG.err("InternalError.Inconsistency");
    }
    return;
  }

  async sync_confirmed_transactions(
    sync_state: SyncState,
    confirmables: Confirm[],
    confirmed_txs: ConfirmedTx[]
  ): Promise<void> {
    DEBUG.log("*********", "sync_confirmed_transactions");

    for (const ctx of confirmed_txs) {
      let transaction = ctx.txs[0][1];
      for (const c of confirmables) {
        const txdata = [
          TwoTuple_usizeTransactionZ.constructor_new(
            ctx.pos,
            transaction.toBuffer()
          ),
        ];

        let hex_block_header = await this.bitcoind_client.getHeaderByHash(
          ctx.block_header.id
        );

        console.log(
          chalk.magentaBright(
            `[EsploraSyncClient.ts/sync_confirmed_transactions]: c.transactions_confirmed(${hexToUint8Array(
              hex_block_header
            )}, ${txdata}, ${ctx.block_height})`
          )
        );

        c.transactions_confirmed(
          hexToUint8Array(hex_block_header),
          txdata,
          ctx.block_height
        );
      }
      sync_state.watched_transactions.delete(transaction.toHex());

      for (const input of ctx.txs[0][1].ins) {
        sync_state.watched_outputs.delete(
          OutPoint.constructor_new(input.hash, input.index)
        );
      }
    }
  }

  async get_confirmed_transactions(
    sync_state: SyncState
  ): Promise<ConfirmedTx[]> {
    let confirmed_txs: ConfirmedTx[] = [];

    for (const txid of sync_state.watched_transactions) {
      DEBUG.log(
        "const txid of sync_state.watched_transactions, txid: ",
        "get_confirmed_transactions",
        txid
      );

      // reverse byte txid here
      let txid_data = await this.bitcoind_client.getTxIdData(txid);

      DEBUG.log(
        "block_hash found->",
        "get_confirmed_transactions",
        txid_data?.hash
      );
      DEBUG.log(
        "block_height found->",
        "get_confirmed_transactions",
        txid_data?.height
      );

      const confirmed_tx = await this.get_confirmed_tx(
        txid,
        txid_data?.hash,
        txid_data?.height
      );
      if (confirmed_tx) {
        confirmed_txs.push(confirmed_tx);
      }
    }

    for (const [, output] of sync_state.watched_outputs) {
      let hex_tx = uint8ArrayToHexString(output.get_outpoint().get_txid());

      // check me
      const output_status = await this.bitcoind_client.getTxOut(
        hex_tx,
        output.get_outpoint().get_index()
      );

      if (output_status && output_status.txid && output_status.status) {
        const { txid: spending_txid, status: spending_tx_status } =
          output_status;

        const confirmed_tx = await this.get_confirmed_tx(
          spending_txid,
          spending_tx_status.block_hash,
          spending_tx_status.block_height
        );

        if (confirmed_tx) {
          confirmed_txs.push(confirmed_tx);
        }
      }
    }

    confirmed_txs.sort((tx1, tx2) => {
      return tx1.block_height - tx2.block_height || tx1.pos - tx2.pos;
    });

    return confirmed_txs;
  }

  reverse_txid(txid: string) {
    let reverse_txid = txid
      .match(/[a-fA-F0-9]{2}/g)
      ?.reverse()
      .join("");
    return reverse_txid;
  }

  async get_confirmed_tx(
    txid: string,
    block_hash: string | undefined,
    block_height: number | undefined
  ): Promise<ConfirmedTx | any> {
    if (block_hash !== undefined && block_height !== undefined) {
      console.log(
        chalk.magenta(
          "[EsploraSyncClient.ts/get_confirmed_tx]: block_hash for block header->",
          block_hash
        )
      );

      const block_header = await this.bitcoind_client.getBlockHeader(
        block_hash
      );
      if (!block_header) {
        return undefined;
      }

      console.log(
        chalk.magenta(
          "[EsploraSyncClient.ts/get_confirmed_tx]: txid for getRawTransaction->",
          txid
        )
      );

      const tx_hex = await this.bitcoind_client.getRawTransaction(txid);
      if (!tx_hex) {
        return undefined;
      }

      const tx = Transaction.fromHex(tx_hex);

      const merkel_proof = await this.bitcoind_client.getMerkleProofPosition(
        txid
      );

      return {
        block_header,
        txs: [[0, tx]],
        block_height,
        pos: merkel_proof.pos,
      };
    }

    const txout = await this.bitcoind_client.getTxOut(txid, 0);
    if (!txout || !txout.confirmations) {
      return undefined;
    }

    const tx_hex = await this.bitcoind_client.getRawTransaction(txid);
    if (!tx_hex) {
      return undefined;
    }

    const tx = Transaction.fromHex(tx_hex);

    return {
      block_header: undefined,
      txs: [[0, tx]],
      block_height: txout.confirmations,
    };
  }

  async get_unconfirmed_transactions(confirmables: Confirm[]) {
    // Query the interface for relevant txids and check whether the relevant blocks are still
    // in the best chain, mark them unconfirmed otherwise
    const relevantTxids = new Set(
      confirmables
        .map((c) => c.get_relevant_txids())
        .flat()
        .map((tuple) => [
          uint8ArrayToHexString(tuple.get_a()),
          uint8ArrayToHexString(tuple.get_b()),
        ])
    );
    const unconfirmedTxs: string[] | any = [];
    for (const [txid, blockHashOpt] of relevantTxids) {
      DEBUG.log(
        "const [txid, blockHashOpt] of relevantTxids",
        "get_unconfirmed_transactions",
        txid + " blockHashOpt:" + blockHashOpt
      );
      if (blockHashOpt !== undefined) {
        let reverse_blockhash = this.reverse_txid(blockHashOpt);
        const blockStatus = await this.bitcoind_client.getBlockStatus(
          reverse_blockhash + ""
        );
        if (!blockStatus.in_best_chain) {
          DEBUG.log(
            "!blockStatus.in_best_chain adding unconfirmedTx",
            "get_unconfirmed_transactions",
            txid
          );
          let reverse_txid = this.reverse_txid(txid + "");
          unconfirmedTxs.push(reverse_txid);
        }
      }
    }
    return unconfirmedTxs;
  }

  sync_unconfirmed_transactions(
    sync_state: SyncState,
    confirmables: Confirm[],
    unconfirmed_txs: string[]
  ): void {
    DEBUG.log(
      "unconfirmed_txs passed in:",
      "sync_unconfirmed_transactions",
      unconfirmed_txs
    );
    for (const txid of unconfirmed_txs) {
      for (const c of confirmables) {
        console.log(
          chalk.magentaBright(
            `[EsploraSyncClient.ts/sync_unconfirmed_transactions]: c.transaction_unconfirmed(hexToUint8Array(txid)) ${hexToUint8Array(
              txid
            )}`
          )
        );
        c.transaction_unconfirmed(hexToUint8Array(txid)); //convert back to uint8array
      }
      sync_state.watched_transactions.add(txid);
    }
  }
}
