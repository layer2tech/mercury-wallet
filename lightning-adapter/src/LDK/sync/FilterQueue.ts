import { OutPoint, WatchedOutput } from "lightningdevkit";

// export interface Txid extends Uint8Array {}
//export interface BlockHash extends Object {}

// Represents the current state.
export interface SyncState {
  // Transactions that were previously processed, but must not be forgotten
  // yet since they still need to be monitored for confirmation on-chain.
  watched_transactions: Set<string>;
  // Outputs that were previously processed, but must not be forgotten yet as
  // as we still need to monitor any spends on-chain.
  watched_outputs: Map<OutPoint, WatchedOutput>;
  // The tip hash observed during our last sync.
  last_sync_hash: string | null; // BlockHash
  // Indicates whether we need to resync, e.g., after encountering an error.
  pending_sync: boolean;
}

export function newSyncState(): SyncState {
  return {
    watched_transactions: new Set(),
    watched_outputs: new Map(),
    last_sync_hash: null,
    pending_sync: false,
  };
}

export class FilterQueue {
  // Transactions that were registered via the Filter interface and have to be processed.
  transactions: Set<string>;
  // Outputs that were registered via the Filter interface and have to be processed.
  outputs: Map<OutPoint, WatchedOutput>;

  constructor() {
    this.transactions = new Set<string>();
    this.outputs = new Map<OutPoint, WatchedOutput>();
  }

  // Processes the transaction and output queues and adds them to the given SyncState.
  // Returns true if new items had been registered.
  processQueues(syncState: SyncState): boolean {
    let pendingRegistrations = false;

    if (this.transactions.size > 0) {
      pendingRegistrations = true;
      for (const txid of this.transactions) {
        syncState.watched_transactions.add(txid);
      }
      this.transactions.clear();
    }

    if (this.outputs.size > 0) {
      pendingRegistrations = true;
      for (const [outPoint, watchedOutput] of this.outputs) {
        syncState.watched_outputs.set(outPoint, watchedOutput);
      }
      this.outputs.clear();
    }
    return pendingRegistrations;
  }
}
