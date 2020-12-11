export { GET_ROUTE, POST_ROUTE, post, get } from "./request";
export { MockElectrum } from './electrum/mock_electrum'

export { Wallet } from "./wallet"
export { StateCoin, StateCoinList } from "./statecoin"
export { ACTION } from "./activity_log"
export { txBackupBuild, verifySmtProof } from "./util"

export { deposit } from "./mercury/deposit"
// export { MasterKey2 } from "./mercury/ecdsa";
export { getFeeInfo, getRoot, getStateChain, getSmtProof, getTransferBatchStatus } from "./mercury/info_api"
