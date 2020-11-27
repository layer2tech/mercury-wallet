"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.keyGen = exports.despoitInit = exports.deposit = void 0;
var request_1 = require("./request");
var deposit = function () { return __awaiter(void 0, void 0, void 0, function () {
    var secret_key, proof_key, value, protocol, shared_key_id, master_key, message, sign_msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                secret_key = "12345";
                proof_key = "02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f";
                value = 10;
                protocol = "Deposit";
                return [4 /*yield*/, exports.despoitInit(proof_key)];
            case 1:
                shared_key_id = _a.sent();
                return [4 /*yield*/, exports.keyGen(shared_key_id, secret_key, proof_key, value, protocol)];
            case 2:
                master_key = _a.sent();
                message = "1111";
                return [4 /*yield*/, exports.sign(shared_key_id, master_key, message, protocol)];
            case 3:
                sign_msg = _a.sent();
                console.log("signature: ", sign_msg);
                return [2 /*return*/];
        }
    });
}); };
exports.deposit = deposit;
var despoitInit = function (proof_key) { return __awaiter(void 0, void 0, void 0, function () {
    var deposit_msg1, shared_key_id;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                deposit_msg1 = {
                    auth: "authstr",
                    proof_key: String(proof_key)
                };
                return [4 /*yield*/, request_1.post(request_1.POST_ROUTE.DEPOSIT_INIT, deposit_msg1)];
            case 1:
                shared_key_id = _a.sent();
                return [2 /*return*/, shared_key_id];
        }
    });
}); };
exports.despoitInit = despoitInit;
var keyGen = function (shared_key_id, secret_key, _proof_key, _value, protocol) { return __awaiter(void 0, void 0, void 0, function () {
    var wasm, keygen_msg1, server_resp_key_gen_first, kg_party_one_first_message, client_resp_key_gen_first, key_gen_msg2, kg_party_one_second_message, client_resp_key_gen_second, master_key;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('client-wasm'); })];
            case 1:
                wasm = _a.sent();
                keygen_msg1 = {
                    shared_key_id: shared_key_id,
                    protocol: protocol,
                };
                return [4 /*yield*/, request_1.post(request_1.POST_ROUTE.KEYGEN_FIRST, keygen_msg1)];
            case 2:
                server_resp_key_gen_first = _a.sent();
                kg_party_one_first_message = server_resp_key_gen_first[1];
                client_resp_key_gen_first = JSON.parse(wasm.KeyGen.first_message(secret_key));
                key_gen_msg2 = {
                    shared_key_id: shared_key_id,
                    dlog_proof: client_resp_key_gen_first.kg_party_two_first_message.d_log_proof,
                };
                return [4 /*yield*/, request_1.post(request_1.POST_ROUTE.KEYGEN_SECOND, key_gen_msg2)];
            case 3:
                kg_party_one_second_message = _a.sent();
                client_resp_key_gen_second = JSON.parse(wasm.KeyGen.second_message(JSON.stringify(kg_party_one_first_message), JSON.stringify(kg_party_one_second_message)));
                master_key = JSON.parse(wasm.KeyGen.set_master_key(JSON.stringify(client_resp_key_gen_first.kg_ec_key_pair_party2), JSON.stringify(kg_party_one_second_message
                    .ecdh_second_message
                    .comm_witness
                    .public_share), JSON.stringify(client_resp_key_gen_second.party_two_paillier)));
                return [2 /*return*/, master_key];
        }
    });
}); };
exports.keyGen = keyGen;
// message should be hex string
var sign = function (shared_key_id, master_key, message, protocol) { return __awaiter(void 0, void 0, void 0, function () {
    var wasm, client_resp_sign_first, sign_msg1, sign_party_one_first_message, party_two_sign_message, sign_msg2, signature;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('client-wasm'); })];
            case 1:
                wasm = _a.sent();
                client_resp_sign_first = JSON.parse(wasm.Sign.first_message());
                sign_msg1 = {
                    shared_key_id: shared_key_id,
                    eph_key_gen_first_message_party_two: client_resp_sign_first.eph_key_gen_first_message_party_two,
                };
                return [4 /*yield*/, request_1.post(request_1.POST_ROUTE.SIGN_FIRST, sign_msg1)];
            case 2:
                sign_party_one_first_message = _a.sent();
                party_two_sign_message = JSON.parse(wasm.Sign.second_message(JSON.stringify(master_key), JSON.stringify(client_resp_sign_first.eph_ec_key_pair_party2), JSON.stringify(client_resp_sign_first.eph_comm_witness), JSON.stringify(sign_party_one_first_message), message));
                sign_msg2 = {
                    shared_key_id: shared_key_id,
                    sign_second_msg_request: {
                        protocol: protocol,
                        message: message,
                        party_two_sign_message: party_two_sign_message,
                    },
                };
                return [4 /*yield*/, request_1.post(request_1.POST_ROUTE.SIGN_SECOND, sign_msg2)];
            case 3:
                signature = _a.sent();
                return [2 /*return*/, signature];
        }
    });
}); };
exports.sign = sign;
