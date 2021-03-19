/* tslint:disable */
/* eslint-disable */
/**
* @param {string} root
* @param {string} proof_key
* @param {string} proof
* @returns {any}
*/
export function verify_statechain_smt(root: string, proof_key: string, proof: string): any;
/**
*/
export function init(): void;
/**
*/
export function test_wasm(): void;
/**
* @param {string} pk
* @returns {any}
*/
export function curv_ge_to_bitcoin_public_key(pk: string): any;
/**
* Handler for `console.log` invocations.
*
* If a test is currently running it takes the `args` array and stringifies
* it and appends it to the current output of the test. Otherwise it passes
* the arguments to the original `console.log` function, psased as
* `original`.
* @param {Array<any>} args
*/
export function __wbgtest_console_log(args: Array<any>): void;
/**
* Handler for `console.debug` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_debug(args: Array<any>): void;
/**
* Handler for `console.info` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_info(args: Array<any>): void;
/**
* Handler for `console.warn` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_warn(args: Array<any>): void;
/**
* Handler for `console.error` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_error(args: Array<any>): void;
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
/**
*/
export class SwapTokenW {
  free(): void;
/**
* @param {string} swap_token_str
* @returns {any}
*/
  static to_message_str(swap_token_str: string): any;
/**
* Create message to be signed
* @param {string} swap_token_str
* @returns {any}
*/
  static to_message_ser(swap_token_str: string): any;
/**
* @param {string} swap_token_str
* @param {string} proof_key_priv_str
* @returns {any}
*/
  static sign(swap_token_str: string, proof_key_priv_str: string): any;
/**
* Verify self's signature for transfer or withdraw
* @param {string} pk_str
* @param {string} sig_str
* @param {string} swap_token_str
* @returns {any}
*/
  static verify_sig(pk_str: string, sig_str: string, swap_token_str: string): any;
}
/**
* Runtime test harness support instantiated in JS.
*
* The node.js entry script instantiates a `Context` here which is used to
* drive test execution.
*/
export class WasmBindgenTestContext {
  free(): void;
/**
* Creates a new context ready to run tests.
*
* A `Context` is the main structure through which test execution is
* coordinated, and this will collect output and results for all executed
* tests.
*/
  constructor();
/**
* Inform this context about runtime arguments passed to the test
* harness.
*
* Eventually this will be used to support flags, but for now it's just
* used to support test filters.
* @param {any[]} args
*/
  args(args: any[]): void;
/**
* Executes a list of tests, returning a promise representing their
* eventual completion.
*
* This is the main entry point for executing tests. All the tests passed
* in are the JS `Function` object that was plucked off the
* `WebAssembly.Instance` exports list.
*
* The promise returned resolves to either `true` if all tests passed or
* `false` if at least one test failed.
* @param {any[]} tests
* @returns {Promise<any>}
*/
  run(tests: any[]): Promise<any>;
}
