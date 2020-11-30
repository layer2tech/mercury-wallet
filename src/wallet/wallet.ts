// Main wallet struct storing Keys derivation material and Mercury Statecoins.

import { Network } from 'bitcoinjs-lib';
import { Statecoin } from './statecoin';

let bitcoin = require('bitcoinjs-lib')
let bip32utils = require('bip32-utils')
let bip32 = require('bip32')
let bip39 = require('bip39')
let fsLibrary  = require('fs')


const WALLET_LOC = "wallet.json";

// Wallet holds BIP32 key root and derivation progress information.
export class Wallet {
  mnemonic: string;
  account: any;
  statecoins: Statecoin[]

  constructor(mnemonic: string, account: any) {
    this.mnemonic = mnemonic
    this.account = account
    this.statecoins = []
  }

  // Constructors
  static fromMnemonic = function (mnemonic: string) {
    return new Wallet(mnemonic, mnemonic_to_bip32_root_account(mnemonic))
  }

  static buildMock = function () {
    var wallet = Wallet.fromMnemonic('praise you muffin lion enable neck grocery crumble super myself license ghost');
    wallet.statecoins.push(
      new Statecoin("861d2223-7d84-44f1-ba3e-4cd7dd418560", {a: 12}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41")
    )
    wallet.statecoins.push(
      new Statecoin("223861d2-7d84-44f1-ba3e-4cd7dd418560", {a: 12}, 0.2, "5c2cf407970d7213f2b4289901958f2978e3b2fe3ef6aca531316cdcf347cc41")
    )
    return wallet
  }

  static load = async (
    {file_path = WALLET_LOC, network = bitcoin.networks.bitcoin, addressFunction = segwitAddr}:
    {file_path?: string, network?: Network, addressFunction?: Function}
  ) => {
    // Fetch raw json
    let str_wallet: string = await new Promise((resolve,_reject) => {
          fsLibrary.readFile(file_path, (error: any, txtString: String) => {
            if (error) throw error;
            resolve(txtString.toString())
          });
      });
    let json_wallet: Wallet = JSON.parse(str_wallet);

    // Re-derive Account from JSON
    const chains = json_wallet.account.map(function (j: any) {
      const node = bip32.fromBase58(j.node, network)

      const chain = new bip32utils.Chain(node, j.k, addressFunction)
      chain.map = j.map

      chain.addresses = Object.keys(chain.map).sort(function (a, b) {
        return chain.map[a] - chain.map[b]
      })

      return chain
    })

    let account = new bip32utils.Account(chains)
    return new Wallet(json_wallet.mnemonic, account)
  }

  save = ({file_path = WALLET_LOC}: {file_path?: string}={}) => {
    // Store in file as JSON string
    fsLibrary.writeFile(file_path, JSON.stringify(this), (error: any) => {
      if (error) throw error;
    })
  };


  // Getters
  getMnemonic() {
    return this.mnemonic
  }
  getStatecoinsInfo() {
    this.statecoins.map((item: Statecoin) => {
      return item.getInfo()
    })
  }


  // Add Statecoin
  addStatecoin(statecoin: Statecoin) {
    this.statecoins.push(statecoin)
  }

  // New BTC address
  genBtcAddress() {
    return this.account.nextChainAddress(0)
  }
}


// BIP39 mnemonic -> BIP32 Account
const mnemonic_to_bip32_root_account = (mnemonic: string) => {
  if (!bip39.validateMnemonic(mnemonic)) {
    return "Invalid mnemonic"
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed);

  let i = root.deriveHardened(0)
  let external = i.derive(0)
  let internal = i.derive(1)

  // BIP32 Account is made up of two BIP32 Chains.
  let account = new bip32utils.Account([
    new bip32utils.Chain(external, null, segwitAddr),
    new bip32utils.Chain(internal, null, segwitAddr)
  ])
  return account
}

// Address generation fn
const segwitAddr = (node: any) => {
  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: node.publicKey,
    network: bitcoin.networks.bitcoin
  })
  return p2wpkh.address
}
