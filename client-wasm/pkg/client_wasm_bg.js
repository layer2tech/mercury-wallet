// eslint-disable-next-line react/no-did-mount-set-state
import * as wasm from './client_wasm_bg.wasm';

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}
/**
* @param {string} challenge
* @returns {any}
*/
export function solve_pow_challenge(challenge) {
    var ptr0 = passStringToWasm0(challenge, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.solve_pow_challenge(ptr0, len0);
    return takeObject(ret);
}

/**
*/
export function test_wasm() {
    wasm.test_wasm();
}

/**
* @param {string} pk
* @returns {any}
*/
export function curv_ge_to_bitcoin_public_key(pk) {
    var ptr0 = passStringToWasm0(pk, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.curv_ge_to_bitcoin_public_key(ptr0, len0);
    return takeObject(ret);
}

/**
* @param {string} json_str
* @param {string} field_name
* @returns {any}
*/
export function convert_bigint_to_client_curv_version(json_str, field_name) {
    var ptr0 = passStringToWasm0(json_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ptr1 = passStringToWasm0(field_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    var ret = wasm.convert_bigint_to_client_curv_version(ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
*/
export function init() {
    wasm.init();
}

/**
* @param {string} root
* @param {string} proof_key
* @param {string} proof
* @returns {any}
*/
export function verify_statechain_smt(root, proof_key, proof) {
    var ptr0 = passStringToWasm0(root, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ptr1 = passStringToWasm0(proof_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    var ptr2 = passStringToWasm0(proof, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len2 = WASM_VECTOR_LEN;
    var ret = wasm.verify_statechain_smt(ptr0, len0, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
* Provides wrappers for Swap methods
*/
export class BSTRequestorData {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bstrequestordata_free(ptr);
    }
    /**
    * @param {string} r_prime_str
    * @param {string} m
    * @returns {any}
    */
    static setup(r_prime_str, m) {
        var ptr0 = passStringToWasm0(r_prime_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(m, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ret = wasm.bstrequestordata_setup(ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * Create BlindedSpendToken for blinded signature
    * @param {string} bst_requestor_data_str
    * @param {string} signature_str
    * @returns {any}
    */
    static make_blind_spend_token(bst_requestor_data_str, signature_str) {
        var ptr0 = passStringToWasm0(bst_requestor_data_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(signature_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ret = wasm.bstrequestordata_make_blind_spend_token(ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * @param {string} s_prime
    * @param {string} u
    * @param {string} v
    * @returns {any}
    */
    static requester_calc_s(s_prime, u, v) {
        var ptr0 = passStringToWasm0(s_prime, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(u, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = passStringToWasm0(v, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        var ret = wasm.bstrequestordata_requester_calc_s(ptr0, len0, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
}
/**
* Provides wrappers for Swap methods
*/
export class BSTSenderData {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bstsenderdata_free(ptr);
    }
    /**
    * Generate new BSTSenderData for Swap
    * @returns {any}
    */
    static setup() {
        var ret = wasm.bstsenderdata_setup();
        return takeObject(ret);
    }
}
/**
* Provides wrappers for Swap methods
*/
export class Commitment {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_commitment_free(ptr);
    }
    /**
    * @param {string} data
    * @returns {any}
    */
    static make_commitment(data) {
        var ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ret = wasm.commitment_make_commitment(ptr0, len0);
        return takeObject(ret);
    }
}
/**
* Provides wrappers for kms-secp256k1 MasterKey2 KeyGen methods
*/
export class KeyGen {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keygen_free(ptr);
    }
    /**
    * @param {string} secret_key
    * @returns {any}
    */
    static first_message(secret_key) {
        var ptr0 = passStringToWasm0(secret_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ret = wasm.keygen_first_message(ptr0, len0);
        return takeObject(ret);
    }
    /**
    * @param {string} kg_party_one_first_message
    * @param {string} kg_party_one_second_message
    * @returns {any}
    */
    static second_message(kg_party_one_first_message, kg_party_one_second_message) {
        var ptr0 = passStringToWasm0(kg_party_one_first_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(kg_party_one_second_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ret = wasm.keygen_second_message(ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * @param {string} kg_ec_key_pair_party2
    * @param {string} public_share
    * @param {string} party_two_paillier
    * @returns {any}
    */
    static set_master_key(kg_ec_key_pair_party2, public_share, party_two_paillier) {
        var ptr0 = passStringToWasm0(kg_ec_key_pair_party2, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(public_share, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = passStringToWasm0(party_two_paillier, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        var ret = wasm.keygen_set_master_key(ptr0, len0, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
}
/**
* Provides wrappers for kms-secp256k1 MasterKey2 Sign methods
*/
export class Sign {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sign_free(ptr);
    }
    /**
    * @returns {any}
    */
    static first_message() {
        var ret = wasm.sign_first_message();
        return takeObject(ret);
    }
    /**
    * @param {string} master_key
    * @param {string} eph_ec_key_pair_party2
    * @param {string} eph_comm_witness
    * @param {string} eph_party1_first_message
    * @param {string} message
    * @returns {any}
    */
    static second_message(master_key, eph_ec_key_pair_party2, eph_comm_witness, eph_party1_first_message, message) {
        var ptr0 = passStringToWasm0(master_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(eph_ec_key_pair_party2, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = passStringToWasm0(eph_comm_witness, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        var ptr3 = passStringToWasm0(eph_party1_first_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len3 = WASM_VECTOR_LEN;
        var ptr4 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len4 = WASM_VECTOR_LEN;
        var ret = wasm.sign_second_message(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
        return takeObject(ret);
    }
}
/**
* Provides wrappers for Swap methods
*/
export class Swap {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_swap_free(ptr);
    }
    /**
    * @param {string} r_prime_str
    * @param {string} m
    * @returns {any}
    */
    static requester_calc_eprime(r_prime_str, m) {
        var ptr0 = passStringToWasm0(r_prime_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(m, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ret = wasm.swap_requester_calc_eprime(ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
}

export function __wbindgen_string_new(arg0, arg1) {
    var ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
};

export function __wbg_new_59cb74e423758ede() {
    var ret = new Error();
    return addHeapObject(ret);
};

export function __wbg_stack_558ba5917b466edd(arg0, arg1) {
    var ret = getObject(arg1).stack;
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_error_4bb6c2a97407129a(arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
};

export function __wbg_new_3a746f2619705add(arg0, arg1) {
    var ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbg_call_f54d3a6dadb199ca(arg0, arg1) {
    var ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
};

export function __wbindgen_jsval_eq(arg0, arg1) {
    var ret = getObject(arg0) === getObject(arg1);
    return ret;
};

export function __wbg_self_ac379e780a0d8b94(arg0) {
    var ret = getObject(arg0).self;
    return addHeapObject(ret);
};

export function __wbg_crypto_1e4302b85d4f64a2(arg0) {
    var ret = getObject(arg0).crypto;
    return addHeapObject(ret);
};

export function __wbindgen_is_undefined(arg0) {
    var ret = getObject(arg0) === undefined;
    return ret;
};

export function __wbg_getRandomValues_1b4ba144162a5c9e(arg0) {
    var ret = getObject(arg0).getRandomValues;
    return addHeapObject(ret);
};

export function __wbg_require_6461b1e9a0d7c34a(arg0, arg1) {
    var ret = require(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbg_randomFillSync_1b52c8482374c55b(arg0, arg1, arg2) {
    getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
};

export function __wbg_getRandomValues_1ef11e888e5228e9(arg0, arg1, arg2) {
    getObject(arg0).getRandomValues(getArrayU8FromWasm0(arg1, arg2));
};

export function __wbg_log_9a99fb1af846153b(arg0) {
    console.log(getObject(arg0));
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export function __wbindgen_rethrow(arg0) {
    throw takeObject(arg0);
};

