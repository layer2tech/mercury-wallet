export { HttpClient, GET_ROUTE, POST_ROUTE } from "./http_client";
export { ElectrumClient } from './electrum'

export { MockHttpClient } from "./mocks/mock_http_client";
export { MockElectrumClient } from './mocks/mock_electrum';
export { MockWasm } from './mocks/mock_wasm';


export { Wallet, pubKeyTobtcAddr, pubKeyToScriptPubKey } from "./wallet"
export { StateCoin, StateCoinList } from "./statecoin"
export { ACTION } from "./activity_log"
export { txBackupBuild, verifySmtProof, signStateChainSig, verifyStateChainSig } from "./util"

export { depositInit, depositConfirm } from "./mercury/deposit"
// export { MasterKey2 } from "./mercury/ecdsa";
export { getFeeInfo, getRoot, getStateChain, getSmtProof, getTransferBatchStatus } from "./mercury/info_api"
