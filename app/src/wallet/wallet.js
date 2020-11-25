let bitcoin = require('bitcoinjs-lib')
let bip32utils = require('bip32-utils')
let bip32 = require('bip32')
let bip39 = require('bip39')
const fsLibrary  = require('fs')

const WALLET_LOC = "wallet.json";

function Wallet(mnemonic, account) {
  this.mnemonic = mnemonic
  this.account = account
}

// Constructors
Wallet.fromMnemonic = function (mnemonic) {
  return new Wallet(mnemonic, Wallet.mnemonic_to_bip32_root_account(mnemonic))
}

// Take mnemonic phrase String and return bip32utils.Account Object.
Wallet.mnemonic_to_bip32_root_account = function (mnemonic) {
  if (!bip39.validateMnemonic(mnemonic)) {
    return "Invalid mnemonic"
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed);

  let i = root.deriveHardened(0)
  let external = i.derive(0)
  let internal = i.derive(1)

  // Bip32 Account is made up of two Bip32 Chains.
  let account = new bip32utils.Account([
    new bip32utils.Chain(external, null, segwitAddr),
    new bip32utils.Chain(internal, null, segwitAddr)
  ])
  return account
}

// Convert bip32utils.Account to json and write to file.
Wallet.prototype.save = function (file_path) {
  // Store in file as JSON string
  fsLibrary.writeFile(file_path, JSON.stringify(this), (error) => {
    if (error) throw err;
  })
};

// Read storage file and parse bip32utils.Account from json.
// Copied from bip32-utils. Library version not compatible with newer bitcoinjs-lib versions.
Wallet.load = async (file_path, network, addressFunction) => {

  // Fetch raw json
  let json_wallet = await new Promise((resolve,reject) => {
        fsLibrary.readFile(file_path, (error, txtString) => {
          if (error) throw err;
          resolve(txtString.toString())
        });
    });
  json_wallet = JSON.parse(json_wallet);

  // Re-derive Account from JSON
  const chains = json_wallet.account.map(function (j) {
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

// Getters
Wallet.prototype.displayAccount = function () {
  console.log(this.account)
}

// Address generation fn
const segwitAddr = (node) => {
  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: node.publicKey,
    network: bitcoin.networks.bitcoin
  })
  return p2wpkh.address
}


const mnemonic =
  'praise you muffin lion enable neck grocery crumble super myself license ghost';

var wallet = Wallet.fromMnemonic(mnemonic);
console.log("Wallet: ", wallet)

wallet.save(WALLET_LOC)

let json = Wallet.load(WALLET_LOC).then(json => {
  console.log("json: ",json)
});
