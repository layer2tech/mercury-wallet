import { GET_ROUTE, get } from "../request";


export const getFeeInfo = async () => {
  return await get(GET_ROUTE.FEES, {})
}

export const getRoot = async () => {
  return await get(GET_ROUTE.ROOT, {});
}

export const getStateChain = async (statechain_id: string) => {
  return await get(GET_ROUTE.STATECHAIN, statechain_id);
}

export const getSmtProot = async () => {
  return await get(GET_ROUTE.SMT_PROOF, {});
}

export const getTransferBatchStatus = async (batch_id: string) => {
  return await get(GET_ROUTE.TRANSFER_BATCH, batch_id);
}


// Verify Spase Merkle Tree proof of inclusion
export const verifySmtProof = async (root: string, proof_key: string, proof: string) => {
  let wasm = await import('client-wasm');
  return wasm.verify_statechain_smt(root, proof_key, proof);
}
