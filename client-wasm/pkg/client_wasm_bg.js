let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error('expected a boolean argument');
    }
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

    if (typeof(arg) !== 'string') throw new Error('expected a string argument');

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
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}
/**
* @param {string} root
* @param {string} proof_key
* @param {string} proof
* @returns {any}
*/
export function verify_statechain_smt(root, proof_key, proof) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(root, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(proof_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(proof, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        wasm.verify_statechain_smt(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
* @param {string} challenge
* @returns {any}
*/
export function solve_pow_challenge(challenge) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(challenge, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.solve_pow_challenge(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
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
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(pk, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.curv_ge_to_bitcoin_public_key(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
* @param {string} json_str
* @param {string} field_name
* @returns {any}
*/
export function convert_bigint_to_client_curv_version(json_str, field_name) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(json_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(field_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.convert_bigint_to_client_curv_version(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
*/
export function init() {
    wasm.init();
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
* Provides wrappers for Swap methods
*/
export class BSTRequestorData {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(r_prime_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(m, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.bstrequestordata_setup(retptr, ptr0, len0, ptr1, len1);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Create BlindedSpendToken for blinded signature
    * @param {string} bst_requestor_data_str
    * @param {string} signature_str
    * @returns {any}
    */
    static make_blind_spend_token(bst_requestor_data_str, signature_str) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(bst_requestor_data_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(signature_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.bstrequestordata_make_blind_spend_token(retptr, ptr0, len0, ptr1, len1);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} s_prime
    * @param {string} u
    * @param {string} v
    * @returns {any}
    */
    static requester_calc_s(s_prime, u, v) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(s_prime, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(u, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(v, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.bstrequestordata_requester_calc_s(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
* Provides wrappers for Swap methods
*/
export class BSTSenderData {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.bstsenderdata_setup(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
* Provides wrappers for Swap methods
*/
export class Commitment {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.commitment_make_commitment(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
* Provides wrappers for kms-secp256k1 MasterKey2 KeyGen methods
*/
export class KeyGen {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(secret_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.keygen_first_message(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kg_party_one_first_message
    * @param {string} kg_party_one_second_message
    * @returns {any}
    */
    static second_message(kg_party_one_first_message, kg_party_one_second_message) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kg_party_one_first_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(kg_party_one_second_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.keygen_second_message(retptr, ptr0, len0, ptr1, len1);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kg_ec_key_pair_party2
    * @param {string} public_share
    * @param {string} party_two_paillier
    * @returns {any}
    */
    static set_master_key(kg_ec_key_pair_party2, public_share, party_two_paillier) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kg_ec_key_pair_party2, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(public_share, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(party_two_paillier, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.keygen_set_master_key(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
* Provides wrappers for kms-secp256k1 MasterKey2 Sign methods
*/
export class Sign {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.sign_first_message(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(master_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(eph_ec_key_pair_party2, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(eph_comm_witness, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passStringToWasm0(eph_party1_first_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len3 = WASM_VECTOR_LEN;
            const ptr4 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len4 = WASM_VECTOR_LEN;
            wasm.sign_second_message(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
* Provides wrappers for Swap methods
*/
export class Swap {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(r_prime_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(m, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.swap_requester_calc_eprime(retptr, ptr0, len0, ptr1, len1);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export function __wbg_error_f851667af71bcfc6() { return logError(function (arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
}, arguments) };

export function __wbg_new_abda76e883ba8a5f() { return logError(function () {
    const ret = new Error();
    return addHeapObject(ret);
}, arguments) };

export function __wbg_stack_658279fe44541cf6() { return logError(function (arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
};

export function __wbg_new_d87f272aec784ec0() { return logError(function (arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_call_eae29933372a39be() { return logError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_self_e0b3266d2d9eba1a() { return logError(function (arg0) {
    const ret = getObject(arg0).self;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_crypto_e95a6e54c5c2e37f() { return logError(function (arg0) {
    const ret = getObject(arg0).crypto;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_getRandomValues_dc67302a7bd1aec5() { return logError(function (arg0) {
    const ret = getObject(arg0).getRandomValues;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_getRandomValues_02639197c8166a96() { return logError(function (arg0, arg1, arg2) {
    getObject(arg0).getRandomValues(getArrayU8FromWasm0(arg1, arg2));
}, arguments) };

export function __wbg_require_0993fe224bf8e202() { return logError(function (arg0, arg1) {
    const ret = require(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_randomFillSync_dd2297de5917c74e() { return logError(function (arg0, arg1, arg2) {
    getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
}, arguments) };

export function __wbindgen_is_undefined(arg0) {
    const ret = getObject(arg0) === undefined;
    _assertBoolean(ret);
    return ret;
};

export function __wbindgen_jsval_eq(arg0, arg1) {
    const ret = getObject(arg0) === getObject(arg1);
    _assertBoolean(ret);
    return ret;
};

export function __wbg_log_7bb108d119bafbc1() { return logError(function (arg0) {
    console.log(getObject(arg0));
}, arguments) };

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

