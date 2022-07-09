"use strict";
import {
  ElectrumClient,
  ElectrsClient,
  EPSClient,
  MockElectrumClient,
  HttpClient,
  MockHttpClient,
  GET_ROUTE,
  POST_ROUTE,
} from "..";

const Promise = require("bluebird");

let types = require("../types");
let typeforce = require("typeforce");

let show_alerts = true;

const version = require("../../../package.json").version;
const semverLt = require("semver/functions/lt");

export interface OutPoint {
  txid: string;
  vout: number;
}

export interface StateChainSig {
  purpose: string;
  data: string;
  sig: string;
}

export interface State {
  data: string;
  next_state: StateChainSig | null;
}

export interface StateChainDataAPI {
  utxo: OutPoint;
  amount: number;
  chain: any[];
  locktime: number;
}

export interface StateCoinDataAPI {
  utxo: OutPoint;
  amount: number;
  statecoin: State;
  locktime: number;
}

export interface Root {
  id: number;
  value: number[];
  commitment_info: any;
}

export interface FeeInfo {
  address: string;
  deposit: number;
  withdraw: number;
  interval: number;
  initlock: number;
  wallet_version: string;
  wallet_warning: string;
}

export interface RecoveryRequest {
  key: string;
  sig: string;
}

export interface RecoveryDataMsg {
  shared_key_id: string;
  statechain_id: string;
  amount: number;
  tx_hex: string;
  proof_key: string;
  shared_key_data: string;
  withdrawing: any;
}

export interface TransferFinalizeDataAPI {
  new_shared_key_id: string;
  statechain_id: string;
  statechain_sig: any;
  s2: string;
  new_tx_backup_hex: string;
  batch_data: any;
}

export const pingServer = async (http_client: HttpClient | MockHttpClient) => {
  var startTime = performance.now();
  await http_client.get(GET_ROUTE.PING, {});
  var endTime = performance.now();
  return endTime - startTime;
};

export const pingConductor = async (
  http_client: HttpClient | MockHttpClient
) => {
  var startTime = performance.now();
  await http_client.get(GET_ROUTE.SWAP_PING, {});
  var endTime = performance.now();
  return endTime - startTime;
};

export const pingElectrum = async (
  electrum_client:
    | ElectrumClient
    | ElectrsClient
    | EPSClient
    | MockElectrumClient
) => {
  var startTime = performance.now();
  let result = await electrum_client.ping();
  if (result !== true) {
    throw Error("failed to ping electrum server");
  }
  var endTime = performance.now();
  return endTime - startTime;
};

export const getFeeInfo = async (http_client: HttpClient | MockHttpClient) => {
  let fee_info = await http_client.get(GET_ROUTE.FEES, {});
  typeforce(types.FeeInfo, fee_info);

  if (fee_info && show_alerts) {
    if (semverLt(version, fee_info.wallet_version)) {
      alert(
        "Wallet version (" +
          version +
          ") incompatible with minimum server requirement (" +
          fee_info.wallet_version +
          "). Please upgrade to the latest version."
      );
    }
    if (fee_info.wallet_message.length > 1) {
      alert("Server alert: " + fee_info.wallet_message);
    }
    show_alerts = false;
  }

  return fee_info;
};

export const getCoinsInfo = async (
  http_client: HttpClient | MockHttpClient
) => {
  let coins_info = await http_client.get(GET_ROUTE.COINS_INFO, {});
  typeforce(types.CoinsInfo, coins_info);
  return coins_info;
};

export const getStateChain = async (
  http_client: HttpClient | MockHttpClient,
  statechain_id: string
): Promise<StateChainDataAPI> => {
  let statechain = await http_client.get(GET_ROUTE.STATECHAIN, statechain_id);

  if (typeof statechain.utxo == "string") {
    let outpoint = {
      txid: statechain.utxo.substring(0, 64),
      vout: parseInt(statechain.utxo.substring(65)),
    };
    statechain.utxo = outpoint;
  }

  typeforce(types.StateChainDataAPI, statechain);
  return statechain;
};

export const getStateChainTransferFinalizeData = async (
  http_client: HttpClient | MockHttpClient,
  statechain_id: String
): Promise<TransferFinalizeDataAPI> => {
  let response = await http_client.get(
    GET_ROUTE.SC_TRANSFER_FINALIZE_DATA,
    statechain_id
  );
  typeforce(types.TransferFinalizeDataAPI, response);
  return response;
};

export const getStateCoin = async (
  http_client: HttpClient | MockHttpClient,
  statechain_id: string
) => {
  let statecoin = await http_client.get(GET_ROUTE.STATECOIN, statechain_id);

  if (typeof statecoin.utxo == "string") {
    let outpoint = {
      txid: statecoin.utxo.substring(0, 64),
      vout: parseInt(statecoin.utxo.substring(65)),
    };
    statecoin.utxo = outpoint;
  }

  typeforce(types.StateCoinDataAPI, statecoin);
  return statecoin;
};

export const getOwner = async (
  http_client: HttpClient | MockHttpClient,
  statechain_id: string
) => {
  let owner_id = await http_client.get(
    GET_ROUTE.STATECHAIN_OWNER,
    statechain_id
  );

  return owner_id.shared_key_id;
};

export const getRoot = async (http_client: HttpClient | MockHttpClient) => {
  let root = await http_client.get(GET_ROUTE.ROOT, {});
  typeforce(typeforce.oneOf(types.Root, typeforce.Null), root);
  return root;
};

export const delay_s = (s: number) => {
  return delay(s * 1000);
};

export const delay = (ms: number) => {
  return Promise.delay(ms);
};

export const getSmtProof = async (
  http_client: HttpClient | MockHttpClient,
  root: Root | null,
  funding_txid: string
) => {
  typeforce(typeforce.oneOf(types.Root, typeforce.Null), root);
  let smt_proof_msg_api = {
    root: root,
    funding_txid: funding_txid,
  };

  // try 5 times to get proof from server
  let attempts = 0;
  let proof = null;
  while (attempts < 5) {
    proof = await http_client.post(POST_ROUTE.SMT_PROOF, smt_proof_msg_api);
    if (proof !== null) {
      typeforce(types.Array, proof);
      return proof;
    }
    await delay(500);
    attempts++;
  }
  // proof still null - throw an error
  throw Error("Proof returned null");
};

export const getTransferBatchStatus = async (
  http_client: HttpClient | MockHttpClient,
  batch_id: string
) => {
  let transfer_batch_status = await http_client.get(
    GET_ROUTE.TRANSFER_BATCH,
    batch_id
  );
  typeforce(types.TransferBatchStatus, transfer_batch_status);
  return transfer_batch_status;
};

export const getRecoveryRequest = async (
  http_client: HttpClient | MockHttpClient,
  recovery_request: RecoveryRequest[]
) => {
  let recovery_data = await http_client.post(
    POST_ROUTE.RECOVER,
    recovery_request
  );
  typeforce(types.Array, recovery_data);
  return recovery_data;
};
