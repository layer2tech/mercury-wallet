'use strict';
export { HttpClient, GET_ROUTE, POST_ROUTE } from "./http_client";
export { ElectrumClient } from './electrum'
export { ElectrsClient } from './electrs'
export { EPSClient } from './eps'

export { MockHttpClient } from "./mocks/mock_http_client";
export { MockElectrumClient } from './mocks/mock_electrum';
export { MockWasm } from './mocks/mock_wasm';


export { Wallet } from "./wallet"
export { StateCoin, StateCoinList, STATECOIN_STATUS, BACKUP_STATUS } from "./statecoin"
export { Config } from "./config"
export { ACTION, ActivityLog } from "./activity_log"
export { txBackupBuild, verifySmtProof, pubKeyToScriptPubKey, pubKeyTobtcAddr,
  fromSatoshi, encryptAES, decryptAES, encodeSCEAddress } from "./util"

export { depositInit, depositConfirm } from "./mercury/deposit"
export { getFeeInfo, getRoot, getStateChain, getStateCoin, getSmtProof, getTransferBatchStatus,
  getRecoveryRequest } from "./mercury/info_api"
