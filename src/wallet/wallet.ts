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
      new Statecoin("861d2223-7d84-44f1-ba3e-4cd7dd418560", dummy_master_key, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41")
    )
    wallet.statecoins.push(
      new Statecoin("223861d2-7d84-44f1-ba3e-4cd7dd418560", dummy_master_key, 0.2, "5c2cf407970d7213f2b4289901958f2978e3b2fe3ef6aca531316cdcf347cc41")
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
    return this.statecoins.map((item: Statecoin) => {
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

  // New Mercury address
  genSEAddress() {
    return {
      se_addr: "026ff25fd651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0ebcrt1qq0znj64a5zukv7yew52zjzmdndch3r0vxu8668",
    }
  }

  // Perform deposit
  deposit(_amount: number) {
    return {
      shared_key_id: "73935730-d35c-438c-87dc-d06054277a5d",
      state_chain_id: "56ee06ea-88b4-415d-b1e9-62b308889d29",
      funding_txid: "f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce",
      backuptx: "3c06e118b822772c024aac3d840fbad3cef62c9f62c9b74e276843a5d0fe0d3d0f3d7b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce",
      proof_key: "441874303fd1524b9660afb44a7edfee49cd9b243db99ea400e876aa15c2983ee7dcf5dc7aec2ae27260ef40378168bfd6d0d1358d611195f4dbd89015f9b785",
      swap_rounds: 0,
      time_left: "12"
    }
  }

  // Perform transfer_sender
  // Args: state_chain_id of coin to send and receivers se_addr.
  // Return: transfer_message String to be sent to receiver.
  transfer_sender(_state_chain_id: string, _receiver_se_addr: string) {
    return {
      transfer_message: "441874303fd1524b9660afb44a7edfee49cd9b243db99ea400e876aa15c2983ee7dcf5dc7aec2ae27260ef40378168bfd6d0d1358d611195f4dbd89015f9b785",
    }
  }

  // Perform transfer_receiver
  // Args: transfer_messager retuned from sender's TransferSender
  // Return: New wallet coin data
  transfer_receiver(_transfer_message: string) {
    return {
      amount: 0.1,
      shared_key_id: "57307393-d35c-438c-87dc-d06054277a5d",
      state_chain_id: "6e56ee0a-88b4-415d-b1e9-62b308889d29",
      funding_txid: "74e2e118b822772c024aac3d840fbad3cf76843a5d0fe0d3d0f3d73c0662c9be",
      backuptx: "22772c024aac3d840fbad3cef62c93c06e118b8f62c9b74e276843a5d0fe0d3d0f3d7b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce",
      proof_key: "fd1524b9660afb44a7edfee49cd9b243db99ea404418743030e876aa15c2983ee7dcf5dc7aec2ae27260ef40378168bfd6d0d1358d611195f4dbd89015f9b785",
      swap_rounds: 0,
      time_left: "11"
    }
  }

  // Perform withdraw
  // Args: state_chain_id of coin to withdraw
  // Return: Txid of withdraw and onchain amount (To be displayed to user)
  withdraw(_state_chain_id: string) {
    return {
      withdraw_txid: "fbad3cf76843a5d0fe0d3d0f3d73c066274e2e118b822772c024aac3d840c9be",
      withdraw_onchain_amount: 0.0999700,
    }
  }

  // Perform swap
  // Args: state_chain_id of coin to swap and swap size parameter. Also provide current coin swap_rounds for GUI demos.
  // Return: New wallet coin data
  swap(state_chain_id: string, _swap_size: number, swap_rounds: number) {
    return {
      amount: 0.1,
      shared_key_id: "h46w1ueui-438c-87dc-d06054277a5d",
      state_chain_id: state_chain_id,
      funding_txid: "4aac3d840fbad3cf76843a5d74e2e118b822772c020fe0d3d0f3d73c0662c9be",
      backuptx: "40fbad3cef62c93c06e118b8f62c9b74e276843a5d0f22772c024aac3d8e0d3d0f3d7b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce",
      proof_key: "43030ed1524b9660afb44a7ed876aa15c2983ee7dcf5dc7aec2aeffee49cd9b243db99ea404418727260ef40378168bfd6d0d1358d611195f4dbd89015f9b785",
      swap_rounds: swap_rounds + 10,
      time_left: "10"
    }
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


const dummy_master_key = {
  public: {
    q: "",
    p2: "",
    p1: "",
    paillier_pub: {},
    c_key: "",
  },
  private: "",
  chain_code: "",
}


// const mnemonic =
//   'praise you muffin lion enable neck grocery crumble super myself license ghost';
//
// var wallet = Wallet.fromMnemonic(mnemonic);
//
// wallet.statecoins.push(
//   new Statecoin({a: 12}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41")
// )
//
// console.log(wallet)
// console.log(wallet.getStatecoinsInfo())


//
// wallet.save(WALLET_LOC)
//
// Wallet.load(WALLET_LOC, bitcoin.networks.bitcoin, segwitAddr).then(json => {
//   console.log("json: ",json)
// });
