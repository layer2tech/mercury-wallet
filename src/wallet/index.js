export { GET_ROUTE, POST_ROUTE, post, get } from "./request";
export { Wallet } from "./wallet"
export { Statecoins } from "./statecoin"
export { ACTION } from "./activity_log"

export { deposit } from "./mercury/deposit"
export { getFeeInfo, getRoot, getStateChain, getSmtProot, getTransferBatchStatus, verifySmtProof } from "./mercury/util"

// StateEntity fee info.
export const GetSEFeeInfo = () => {
  return {
    addr: "bcrt1qjjwk2rk7nuxt6c79tsxthf5rpnky0sdhjr493x",
    deposit_fee: 300,
    withdraw_fee: 300,
    interval: 100,
    init_lock: 10000
  }
}
