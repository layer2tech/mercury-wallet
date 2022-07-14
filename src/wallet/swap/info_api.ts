'use strict';
import { HttpClient, MockHttpClient, GET_ROUTE, POST_ROUTE, ElectrumClient, MockElectrumClient } from "..";
import { BSTMsg, SwapID, StatechainID, SwapGroup, GroupInfo, log } from './swap_utils';



let types = require("../types")
let typeforce = require('typeforce');


export const pingServer = async (
  http_client: HttpClient | MockHttpClient,
) => {
  var startTime = performance.now()
  await http_client.get(GET_ROUTE.SWAP_PING, {})
  var endTime = performance.now()
  return endTime - startTime
}

export const pingElectrum = async (
  electrum_client: ElectrumClient | MockElectrumClient,
) => {
  var startTime = performance.now()
  await electrum_client.ping()
  var endTime = performance.now()
  return endTime - startTime
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

export const swapRegisterUtxo = async (
  http_client: HttpClient | MockHttpClient,
  registerUtxo: any
) => {
  await http_client.post(POST_ROUTE.SWAP_REGISTER_UTXO, registerUtxo);
}

export const swapDeregisterUtxo = async (
  http_client: HttpClient | MockHttpClient,
  statechain_id: StatechainID
) => {
  await http_client.post(POST_ROUTE.SWAP_DEREGISTER_UTXO, statechain_id);
}

export const getSwapInfo = async (
  http_client: HttpClient | MockHttpClient,
  swap_id: SwapID
) => {
  let swap_info = await http_client.post(POST_ROUTE.SWAP_INFO, swap_id);
  typeforce(typeforce.oneOf(types.SwapInfo, typeforce.Null), swap_info);
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

export const groupInfo = async (
  http_client: HttpClient | MockHttpClient,
): Promise<Map<SwapGroup, GroupInfo> | null> => {
  try {
    let sgm_json = await http_client.get(GET_ROUTE.SWAP_GROUPINFO, {})

    typeforce(types.SwapGroupMap, sgm_json);

    //let map: Map<SwapGroup, number> = sgm_json;
    let map = new Map<SwapGroup, GroupInfo>();
    for (var value_str in sgm_json) {
      let value_arr = value_str.split(":");
      let group_arr = sgm_json[value_str].split(":")

      let swap_group = {
        "amount": parseInt(value_arr[0]),
        "size": parseInt(value_arr[1])
      }
      let group_info = {
        "number": parseInt(group_arr[0]),
        "time": parseInt(group_arr[1])
      }
      map.set(swap_group, group_info)
    }
    return map
  } catch (err: any) {
    log.warn(`groupInfo: ${err}`)
    return null
  }
}
