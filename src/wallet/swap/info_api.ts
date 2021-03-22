import { HttpClient, MockHttpClient, GET_ROUTE, POST_ROUTE } from "..";
import { BSTMsg, SwapID, StatechainID, SwapGroup} from './swap';

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

export const groupInfo = async(
  http_client: HttpClient | MockHttpClient,
) =>  {
  let sgm_json = await http_client.get(GET_ROUTE.SWAP_GROUPINFO, {})
  typeforce(types.SwapGroupMap, sgm_json);

  let map = new Map<SwapGroup, number>();
  for (var value_json in sgm_json) {
    let value = JSON.parse(value_json);
    map.set(value, sgm_json[value])
  }
  return map
} 


