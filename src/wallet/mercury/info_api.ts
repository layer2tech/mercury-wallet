import { GET_ROUTE, get } from "../request";


export const getFeeInfo = async () => {
  return await get(GET_ROUTE.FEES, {})
}

export const getStateChain = async (statechain_id: string) => {
  return await get(GET_ROUTE.STATECHAIN, statechain_id);
}

export const getRoot = async () => {
  let root = await get(GET_ROUTE.ROOT, {});
  // assert types
  return root
}

export const getSmtProof = async (root: string, funding_txid: string) => {
  let proof = await get(GET_ROUTE.SMT_PROOF, {});
  // assert types
  return proof
}

export const getTransferBatchStatus = async (batch_id: string) => {
  return await get(GET_ROUTE.TRANSFER_BATCH, batch_id);
}


export interface Root {

}
