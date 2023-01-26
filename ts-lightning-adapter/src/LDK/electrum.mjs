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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
exports.__esModule = true;
exports.POST_ROUTE = exports.GET_ROUTE = void 0;
// const {Buffer} = require('buffer');
var axios = Promise.resolve().then(function () { return require("axios"); });
var TIMEOUT = 20000;
var ElectrumClient = /** @class */ (function () {
    function ElectrumClient(endpoint) {
        this.endpoint = endpoint;
    }
    ElectrumClient.prototype.getBlockHeight = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Get Block Height...");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, ElectrumClient.get("http://127.0.0.1:18443/rest/chaininfo.json")];
                    case 2:
                        res = (_a.sent()).data;
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.log('Error Getting Block Height');
                        return [3 /*break*/, 4];
                    case 4:
                        if (res) {
                            return [2 /*return*/, res.blocks];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ElectrumClient.prototype.getLatestBlockHeader = function (height) {
        return __awaiter(this, void 0, void 0, function () {
            var currentBlockHash, e_2, res, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("HEIGHT: ", height);
                        return [4 /*yield*/, ElectrumClient.get("http://127.0.0.1:18443/rest/blockhashbyheight/".concat(height, ".json"))];
                    case 1:
                        currentBlockHash = (_a.sent()).data.blockhash;
                        return [3 /*break*/, 3];
                    case 2:
                        e_2 = _a.sent();
                        console.log("Error Getting Current Block Hash");
                        return [3 /*break*/, 3];
                    case 3:
                        // return currentBlockHash
                        console.log("Get Latest Block Header...");
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, ElectrumClient.get("http://127.0.0.1:18443/rest/headers/1/".concat(currentBlockHash, ".hex"))];
                    case 5:
                        res = (_a.sent()).data;
                        return [3 /*break*/, 7];
                    case 6:
                        e_3 = _a.sent();
                        console.log("Error in getting header: ", e_3);
                        return [3 /*break*/, 7];
                    case 7:
                        if (res) {
                            // console.log('BLOCK JEADER::: ',res)
                            // console.log(res);
                            // const blockArray = new Uint8Array(Buffer.from(JSON.stringify(res.tx)))
                            return [2 /*return*/, res];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ElectrumClient.prototype.getTxIdData = function (txid) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ElectrumClient.get("http://127.0.0.1:18443/rest/tx/".concat(txid, ".json"))];
                    case 1:
                        res = (_a.sent()).data;
                        return [2 /*return*/, [res.blockheight, res.hex]];
                }
            });
        });
    };
    ElectrumClient.get = function (endpoint, timeout_ms) {
        if (timeout_ms === void 0) { timeout_ms = TIMEOUT; }
        return __awaiter(this, void 0, void 0, function () {
            var axios, url, config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("axios"); })];
                    case 1:
                        axios = (_a.sent())["default"];
                        url = endpoint;
                        config = {
                            method: "get",
                            url: url,
                            headers: { Accept: "application/json" },
                            timeout: timeout_ms
                        };
                        return [4 /*yield*/, axios(config)];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ElectrumClient.post = function (endpoint, timeout_ms) {
        if (timeout_ms === void 0) { timeout_ms = TIMEOUT; }
        return __awaiter(this, void 0, void 0, function () {
            var axios, options;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("axios"); })];
                    case 1:
                        axios = (_a.sent())["default"];
                        options = {
                            headers: {
                                "Content-Type": "text/plain"
                            },
                            data: {
                                jsonrpc: "1.0",
                                id: "curltest",
                                method: "getblockchaininfo"
                            }
                        };
                        axios
                            .post("http://polaruser:polarpass@127.0.0.1:18443/", options)
                            .then(function (response) {
                            console.log("RESPONSE: ", response.data);
                            return response.data;
                        })["catch"](function (error) {
                            console.log("ERROR: ", error);
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return ElectrumClient;
}());
exports.GET_ROUTE = {
    PING: "/electrs/ping",
    //latestBlockHeader "/Electrs/block/:hash/header",
    BLOCK: "/electrs/block",
    BLOCKS_TIP_HASH: "/electrs/blocks/tip/hash",
    HEADER: "header",
    BLOCKS_TIP_HEIGHT: "/electrs/blocks/tip/height",
    //getTransaction /tx/:txid
    TX: "/electrs/tx",
    //getScriptHashListUnspent /scripthash/:hash/utxo
    SCRIPTHASH: "/electrs/scripthash",
    UTXO: "utxo",
    //getFeeEstimates
    FEE_ESTIMATES: "/electrs/fee-estimates"
};
Object.freeze(exports.GET_ROUTE);
exports.POST_ROUTE = {
    //broadcast transaction
    TX: "/electrs/tx"
};
Object.freeze(exports.POST_ROUTE);
exports["default"] = ElectrumClient;
