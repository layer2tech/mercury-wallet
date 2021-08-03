/* tslint:disable */
/* eslint-disable */
/**
* @param {string} challenge
* @returns {any}
*/
export function solve_pow_challenge(challenge: string): any;
/**
*/
export function test_wasm(): void;
/**
* @param {string} pk
* @returns {any}
*/
export function curv_ge_to_bitcoin_public_key(pk: string): any;
/**
* @param {string} json_str
* @param {string} field_name
* @returns {any}
*/
export function convert_bigint_to_client_curv_version(json_str: string, field_name: string): any;
/**
*/
export function init(): void;
/**
* @param {string} root
* @param {string} proof_key
* @param {string} proof
* @returns {any}
*/
export function verify_statechain_smt(root: string, proof_key: string, proof: string): any;
/**
* Provides wrappers for Swap methods
*/
export class BSTRequestorData {
  free(): void;
/**
* @param {string} r_prime_str
* @param {string} m
* @returns {any}
*/
  static setup(r_prime_str: string, m: string): any;
/**
* Create BlindedSpendToken for blinded signature
* @param {string} bst_requestor_data_str
* @param {string} signature_str
* @returns {any}
*/
  static make_blind_spend_token(bst_requestor_data_str: string, signature_str: string): any;
/**
* @param {string} s_prime
* @param {string} u
* @param {string} v
* @returns {any}
*/
  static requester_calc_s(s_prime: string, u: string, v: string): any;
}
/**
* Provides wrappers for Swap methods
*/
export class BSTSenderData {
  free(): void;
/**
* Generate new BSTSenderData for Swap
* @returns {any}
*/
  static setup(): any;
}
/**
* Provides wrappers for Swap methods
*/
export class Commitment {
  free(): void;
/**
* @param {string} data
* @returns {any}
*/
  static make_commitment(data: string): any;
}
/**
* Provides wrappers for kms-secp256k1 MasterKey2 KeyGen methods
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
/**
* @param {string} kg_ec_key_pair_party2
* @param {string} public_share
* @param {string} party_two_paillier
* @returns {any}
*/
  static set_master_key(kg_ec_key_pair_party2: string, public_share: string, party_two_paillier: string): any;
}
/**
* Provides wrappers for kms-secp256k1 MasterKey2 Sign methods
*/
export class Sign {
  free(): void;
/**
* @returns {any}
*/
  static first_message(): any;
/**
* @param {string} master_key
* @param {string} eph_ec_key_pair_party2
* @param {string} eph_comm_witness
* @param {string} eph_party1_first_message
* @param {string} message
* @returns {any}
*/
  static second_message(master_key: string, eph_ec_key_pair_party2: string, eph_comm_witness: string, eph_party1_first_message: string, message: string): any;
}
/**
* Provides wrappers for Swap methods
*/
export class Swap {
  free(): void;
/**
* @param {string} r_prime_str
* @param {string} m
* @returns {any}
*/
  static requester_calc_eprime(r_prime_str: string, m: string): any;
}
