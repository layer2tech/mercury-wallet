/* TODO - CHECK FOR TYPES */
import { HttpClient, MockHttpClient, GET_ROUTE } from "..";

let types = require("../types")
let typeforce = require('typeforce');


declare const window: any;
let log: any;
try {
    log = window.require('electron-log');
} catch (e: any) {
    log = require('electron-log');
}

// parent
export interface TorCircuitData {
    latest: string,
    circuitData: string[]
}

// child
export interface TorCircuit {
    name: string,
    ip: string,
    country: string,
    id: string
}

export const getNewTorId = async (http_client: HttpClient |  MockHttpClient) => {
    let tor_id = null
    try {
        tor_id = await http_client.get(GET_ROUTE.NEW_TOR_ID, {}, 20000);

    } catch (err: any) {
    
        const err_str = err?.message
        const err_code = err?.code
        if (
            (err_str &&
                (err_str.includes('Network Error') ||
                    err_str.includes(`request timed out:`))) ||
            (err_code &&
                err_code === "ECONNRESET")
        ) {
            log.warn(JSON.stringify(err_str))
        } else {
            throw err
        }
    }
    // TODO - check for types
    return tor_id;
}

// parent
export const getTorCircuitIds = async (http_client: HttpClient |  MockHttpClient) => {
    let tor_circuit_ids
    try {
        const timeout_ms = 10000
        tor_circuit_ids = await http_client.get(GET_ROUTE.TOR_CIRCUITS, {}, timeout_ms)
        return tor_circuit_ids.circuitData;
    }catch(e){
        console.error(e)        
        return []
    }
}

// child
export const getTorCircuit = async (
    http_client: HttpClient |  MockHttpClient,
    circuit_id: string
  ) => {
    let circuit 
    try {
        const timeout_ms = 10000
        circuit = await http_client.get(GET_ROUTE.TOR_CIRCUITS, circuit_id, timeout_ms)
        circuit.id = circuit_id
        return circuit
    }
    catch(e){
        console.error(e)
        circuit = {
            name: "",
            ip: "",
            country: "",
            id: circuit_id
        }
        return circuit
    }
    return circuit;
}