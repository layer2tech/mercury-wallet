export { GET_ROUTE, POST_ROUTE, post, get } from "./request";
export { MockElectrum } from './electrum/mock_electrum'
export { Electrum } from './electrum/electrum'

export { Wallet } from "./wallet"
export { StateCoin, StateCoinList } from "./statecoin"
export { ACTION } from "./activity_log"
export { txBackupBuild, verifySmtProof } from "./util"

export { depositInit, depositConfirm } from "./mercury/deposit"
// export { MasterKey2 } from "./mercury/ecdsa";
export { getFeeInfo, getRoot, getStateChain, getSmtProof, getTransferBatchStatus } from "./mercury/info_api"
