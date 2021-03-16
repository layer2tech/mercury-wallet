import { HttpClient, MockHttpClient, GET_ROUTE, POST_ROUTE } from "..";
import { BSTMsg, SwapID, StatechainID} from './swap';

let types = require("../types")
let typeforce = require('typeforce');


export const pingServer = async (
  http_client: HttpClient | MockHttpClient,
) => {
  return await http_client.get(GET_ROUTE.PING, {})
}

export const pollUtxo = async (
  http_client: HttpClient | MockHttpClient,
  statechain_id: StatechainID
) => {

  let swap_id = await http_client.post(POST_ROUTE.SWAP_POLL_UTXO, statechain_id);	
  typeforce(types.SwapID, swap_id);
  return swap_id
}

export const pollSwap = async (
  http_client: HttpClient | MockHttpClient,
  swap_id: SwapID	 
) => {

  let swap_status = await http_client.post(POST_ROUTE.SWAP_POLL_SWAP, swap_id);	

  typeforce(String, swap_status);
  return swap_status
}

export const getSwapInfo = async (
  http_client: HttpClient | MockHttpClient,
  swap_id: SwapID
) => {

  let swap_info = await http_client.post(POST_ROUTE.SWAP_INFO, swap_id);	
  console.log("gotSwapInfo: ", swap_info);
  typeforce(types.SwapInfo, swap_info);
  console.log("swap info conforms to type. Returning");
  return swap_info
}

export const getBlindedSpendSignature = async (
  http_client: HttpClient | MockHttpClient,
  bst_msg: BSTMsg	 
) => {

  let bst = await http_client.post(POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE, bst_msg);	

  typeforce(types.BlindedSpendSignature, bst);
  return bst
}


