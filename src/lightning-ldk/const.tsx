import { ChainMonitor, ChannelManager, ChannelManagerReadArgs, KeysManager, MultiThreadedLockableScore, NetworkGraph, PeerManager } from "lightningdevkit";

export const MARKER_LOG = 'log';
export interface LogMsg {
  ts: string;
  line: string;
}

export const MARKER_REGISTER_OUTPUT = 'marker_register_output';

type ClosureReason = 'ProcessingError' | 'OutdatedChannelManager' | 'HolderForceClosed' | 'DisconnectedPeer' | 'CounterpartyForceClosed' | 'CooperativeClosure' | 'CommitmentTxConfirmed';
export const MARKER_CHANNEL_CLOSED = 'channel_closed';
export interface ChannelClosedMsg {
  reason: ClosureReason;
  channel_id: string;
  user_channel_id: number;
  text?: string;
}

export interface RegisterOutputMsg {
  block_hash: string;
  index: string;
  script_pubkey: string;
}

export const MARKER_REGISTER_TX = 'register_tx';
export interface RegisterTxMsg {
  txid: string;
  script_pubkey: string;
}

export const MARKER_BROADCAST = 'broadcast';
export interface BroadcastMsg {
  txhex: string;
}

export const MARKER_PERSIST = 'persist';
export interface PersistMsg {
  id: string;
  data: string;
}

export const MARKER_PAYMENT_SENT = 'payment_sent';
export interface PaymentSentMsg {
  payment_preimage: string;
}

export const MARKER_PAYMENT_FAILED = 'payment_failed';
export interface PaymentFailedMsg {
  rejected_by_dest: boolean;
  payment_hash: string;
}

export const MARKER_PAYMENT_PATH_FAILED = 'payment_path_failed';
export interface PaymentPathFailedMsg {
  rejected_by_dest: boolean;
  payment_hash: string;
}

export const MARKER_PAYMENT_RECEIVED = 'payment_received';
export interface PaymentReceivedMsg {
  payment_hash: string;
  payment_secret?: string;
  payment_preimage?: string;
  amt: string;
}

export const MARKER_PERSIST_MANAGER = 'persist_manager';
export interface PersistManagerMsg {
  channel_manager_bytes: string;
}

export const MARKER_FUNDING_GENERATION_READY = 'funding_generation_ready';

export interface FundingGenerationReadyMsg {
  channel_value_satoshis: string;
  output_script: string;
  temporary_channel_id: string;
  user_channel_id: string;
}
