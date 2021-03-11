/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export function __wbg_keygen_free(a: number): void;
export function keygen_first_message(a: number, b: number): number;
export function keygen_second_message(a: number, b: number, c: number, d: number): number;
export function keygen_set_master_key(a: number, b: number, c: number, d: number, e: number, f: number): number;
export function __wbg_sign_free(a: number): void;
export function sign_first_message(): number;
export function sign_second_message(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number): number;
export function verify_statechain_smt(a: number, b: number, c: number, d: number, e: number, f: number): number;
export function init(): void;
export function test_wasm(): void;
export function curv_ge_to_bitcoin_public_key(a: number, b: number): number;
export function __wbg_swap_free(a: number): void;
export function swap_requester_calc_eprime(a: number, b: number, c: number, d: number): number;
export function __wbg_bstsenderdata_free(a: number): void;
export function bstsenderdata_setup(): number;
export function __wbg_bstrequestordata_free(a: number): void;
export function bstrequestordata_setup(a: number, b: number, c: number, d: number): number;
export function bstrequestordata_make_blind_spend_token(a: number, b: number, c: number, d: number): number;
export function __wbg_commitment_free(a: number): void;
export function commitment_setup(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_recoverable_signature_serialize_compact(a: number, b: number, c: number, d: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_recoverable_signature_parse_compact(a: number, b: number, c: number, d: number): number;
export function rustsecp256k1_v0_2_0_ec_seckey_verify(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_ec_pubkey_serialize(a: number, b: number, c: number, d: number, e: number): number;
export function rustsecp256k1_v0_2_0_ec_pubkey_parse(a: number, b: number, c: number, d: number): number;
export function rustsecp256k1_v0_2_0_ec_pubkey_tweak_mul(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_context_preallocated_destroy(a: number): void;
export function rustsecp256k1_v0_2_0_context_preallocated_size(a: number): number;
export function rustsecp256k1_v0_2_0_context_preallocated_create(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_signature_serialize_der(a: number, b: number, c: number, d: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_signature_parse_der(a: number, b: number, c: number, d: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_signature_parse_compact(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_signature_normalize(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ec_pubkey_combine(a: number, b: number, c: number, d: number): number;
export function rustsecp256k1_v0_2_0_context_create(a: number): number;
export function rustsecp256k1_v0_2_0_context_destroy(a: number): void;
export function rustsecp256k1_v0_2_0_default_illegal_callback_fn(a: number, b: number): void;
export function rustsecp256k1_v0_2_0_default_error_callback_fn(a: number, b: number): void;
export function rustsecp256k1_v0_2_0_context_preallocated_clone_size(a: number): number;
export function rustsecp256k1_v0_2_0_context_preallocated_clone(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_context_set_illegal_callback(a: number, b: number, c: number): void;
export function rustsecp256k1_v0_2_0_context_set_error_callback(a: number, b: number, c: number): void;
export function rustsecp256k1_v0_2_0_ecdsa_signature_serialize_compact(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_verify(a: number, b: number, c: number, d: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_sign(a: number, b: number, c: number, d: number, e: number, f: number): number;
export function rustsecp256k1_v0_2_0_ec_pubkey_create(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ec_seckey_negate(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_ec_privkey_negate(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_ec_pubkey_negate(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_ec_seckey_tweak_add(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ec_privkey_tweak_add(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ec_pubkey_tweak_add(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ec_seckey_tweak_mul(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ec_privkey_tweak_mul(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_context_randomize(a: number, b: number): number;
export function rustsecp256k1_v0_2_0_ecdh(a: number, b: number, c: number, d: number, e: number, f: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_recoverable_signature_convert(a: number, b: number, c: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_sign_recoverable(a: number, b: number, c: number, d: number, e: number, f: number): number;
export function rustsecp256k1_v0_2_0_ecdsa_recover(a: number, b: number, c: number, d: number): number;
export function __wbindgen_malloc(a: number): number;
export function __wbindgen_realloc(a: number, b: number, c: number): number;
export function __wbindgen_free(a: number, b: number): void;
