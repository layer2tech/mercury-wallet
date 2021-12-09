/* TODO - CHECK FOR TYPES */
import { HttpClient, MockHttpClient, GET_ROUTE } from "..";

let types = require("../types")
let typeforce = require('typeforce');


// parent
export interface TorCircuitData {
    latest: string,
    circuitData: string[]
}

// child
export interface TorCircuit {
    name: string,
    ip: string,
    country: string
}

export const getNewTorId = async (http_client: HttpClient |  MockHttpClient) => {
    let tor_id = await http_client.get(GET_ROUTE.NEW_TOR_ID, {});
    // TODO - check for types
    return tor_id;
}

// parent
export const getTorCircuitIds = async (http_client: HttpClient |  MockHttpClient) => {
    let tor_circuit_ids = await http_client.get(GET_ROUTE.TOR_CIRCUITS, {});
    //console.log(tor_circuit_ids);
    //typeforce(types.TorCircuitData, tor_circuit_ids);
    return tor_circuit_ids.circuitData;
}

// child
export const getTorCircuit = async (
    http_client: HttpClient |  MockHttpClient,
    circuit_id: string
  ) => {
    let circuit = await http_client.get(GET_ROUTE.TOR_CIRCUITS, circuit_id);
    //typeforce(types.TorCircuit, circuit);
    return circuit;
}