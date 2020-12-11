import { GET_ROUTE, POST_ROUTE, get, post } from "../request";

let types = require("../types")
let typeforce = require('typeforce');

export const getFeeInfo = async () => {
  return await get(GET_ROUTE.FEES, {})
}

export const getStateChain = async (statechain_id: string) => {
  return await get(GET_ROUTE.STATECHAIN, statechain_id);
}

export const getRoot = async () => {
  let root = await get(GET_ROUTE.ROOT, {});
  typeforce(types.Root, root);
  return root
}

export const getSmtProof = async (root: Root, funding_txid: string) => {
  typeforce(types.Root, root);
  let smt_proof_msg_api = {
    root: root,
    funding_txid: funding_txid
  };
  let proof = await post(POST_ROUTE.SMT_PROOF, smt_proof_msg_api);
  typeforce(typeforce.Array, proof);
  return proof
}

export const getTransferBatchStatus = async (batch_id: string) => {
  return await get(GET_ROUTE.TRANSFER_BATCH, batch_id);
}


export interface Root {
  id: number,
  value: number[],
  commitment_info: any
}
