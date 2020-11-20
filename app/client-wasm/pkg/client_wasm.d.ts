/* tslint:disable */
/* eslint-disable */
/**
* @param {string} name
*/
export function greet(name: string): void;
/**
*/
export function call_curv_fn(): void;
/**
*/
export function get_statechain(): void;
/**
*/
export function gen_btc_addr(): void;
/**
*/
export function gen_se_addr(): void;
/**
*/
export function deposit(): void;
/**
*/
export function transfer_sender(): void;
/**
*/
export function transfer_receiver(): void;
/**
*/
export function withdraw(): void;
/**
*/
export function swap(): void;
/**
*/
export class KeyGen {
  free(): void;
/**
* @param {string} secret_key
* @returns {any}
*/
  static first_message(secret_key: string): any;
/**
* @param {string} kg_party_one_first_message
* @param {string} kg_party_one_second_message
* @returns {any}
*/
  static second_message(kg_party_one_first_message: string, kg_party_one_second_message: string): any;
}
