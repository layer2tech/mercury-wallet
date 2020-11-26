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
var bitcoin = require('bitcoinjs-lib');
var bip32utils = require('bip32-utils');
var bip32 = require('bip32');
var bip39 = require('bip39');
var fsLibrary = require('fs');
var WALLET_LOC = "wallet.json";
// Wallet holds BIP32 key root and derivation progress information.
var Wallet = /** @class */ (function () {
    function Wallet(mnemonic, account) {
        var _this = this;
        this.save = function (file_path) {
            // Store in file as JSON string
            fsLibrary.writeFile(file_path, JSON.stringify(_this), function (error) {
                if (error)
                    throw error;
            });
        };
        // Getters
        this.displayAccount = function () {
            console.log(_this.account);
        };
        this.mnemonic = mnemonic;
        this.account = account;
    }
    // Constructors
    Wallet.fromMnemonic = function (mnemonic) {
        return new Wallet(mnemonic, mnemonic_to_bip32_root_account(mnemonic));
    };
    Wallet.load = function (file_path, network, addressFunction) { return __awaiter(void 0, void 0, void 0, function () {
        var str_wallet, json_wallet, chains, account;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve, _reject) {
                        fsLibrary.readFile(file_path, function (error, txtString) {
                            if (error)
                                throw error;
                            resolve(txtString.toString());
                        });
                    })];
                case 1:
                    str_wallet = _a.sent();
                    json_wallet = JSON.parse(str_wallet);
                    chains = json_wallet.account.map(function (j) {
                        var node = bip32.fromBase58(j.node, network);
                        var chain = new bip32utils.Chain(node, j.k, addressFunction);
                        chain.map = j.map;
                        chain.addresses = Object.keys(chain.map).sort(function (a, b) {
                            return chain.map[a] - chain.map[b];
                        });
                        return chain;
                    });
                    account = new bip32utils.Account(chains);
                    return [2 /*return*/, new Wallet(json_wallet.mnemonic, account)];
            }
        });
    }); };
    return Wallet;
}());
// BIP39 mnemonic -> BIP32 Account
var mnemonic_to_bip32_root_account = function (mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
        return "Invalid mnemonic";
    }
    var seed = bip39.mnemonicToSeedSync(mnemonic);
    var root = bip32.fromSeed(seed);
    var i = root.deriveHardened(0);
    var external = i.derive(0);
    var internal = i.derive(1);
    // BIP32 Account is made up of two BIP32 Chains.
    var account = new bip32utils.Account([
        new bip32utils.Chain(external, null, segwitAddr),
        new bip32utils.Chain(internal, null, segwitAddr)
    ]);
    return account;
};
// Address generation fn
var segwitAddr = function (node) {
    var p2wpkh = bitcoin.payments.p2wpkh({
        pubkey: node.publicKey,
        network: bitcoin.networks.bitcoin
    });
    return p2wpkh.address;
};
var mnemonic = 'praise you muffin lion enable neck grocery crumble super myself license ghost';
var wallet = Wallet.fromMnemonic(mnemonic);
wallet.save(WALLET_LOC);
Wallet.load(WALLET_LOC, bitcoin.networks.bitcoin, segwitAddr).then(function (json) {
    console.log("json: ", json);
});
