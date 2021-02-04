// Main wallet struct storing Keys derivation material and Mercury Statecoins.

import { BIP32Interface, Network, Transaction } from 'bitcoinjs-lib';
import { ACTION, ActivityLog, ActivityLogItem } from './activity_log';
import { ElectrumClient, MockElectrumClient, HttpClient, MockHttpClient, StateCoinList,
  MockWasm, StateCoin, pubKeyTobtcAddr, fromSatoshi } from './';
import { MasterKey2 } from "./mercury/ecdsa"
import { depositConfirm, depositInit } from './mercury/deposit';
import { withdraw } from './mercury/withdraw';
import { TransferMsg3, transferSender, transferReceiver, transferReceiverFinalize, TransferFinalizeData } from './mercury/transfer';
import { v4 as uuidv4 } from 'uuid';
import { Config } from './config';

let bitcoin = require('bitcoinjs-lib');
let bip32utils = require('bip32-utils');
let bip32 = require('bip32');
let bip39 = require('bip39');
let fsLibrary  = require('fs');

const WALLET_LOC = "wallet.json";

// Logger
declare const window: any;
let log: any;
try {
  log = window.require('electron-log');
} catch (e) {
  log = require('electron-log');
}

// Store
// const Store = window.require('electron-store');
// const store = new Store();


// Wallet holds BIP32 key root and derivation progress information.
export class Wallet {
  config: Config;
  version: string;
  mnemonic: string;
  account: any;
  statecoins: StateCoinList;
  activity: ActivityLog;
  http_client: HttpClient | MockHttpClient;
  electrum_client: ElectrumClient | MockElectrumClient;

  constructor(mnemonic: string, account: any, network: Network, testing_mode: boolean) {
    this.config = new Config(network, testing_mode);
    this.version = "vesion"
    this.version = require("../../package.json").version

    this.mnemonic = mnemonic;
    this.account = account;
    this.statecoins = new StateCoinList();
    this.activity = new ActivityLog();
    if (testing_mode) {
      this.electrum_client = new MockElectrumClient();
      this.http_client = new MockHttpClient();
    } else {
      // this.electrum_client = new ElectrumClient(config.electrum_config);
      this.electrum_client = new MockElectrumClient();
      this.http_client = new HttpClient(this.config.state_entity_endpoint);
    }
  }

  // Constructors
  static fromMnemonic(mnemonic: string, network: Network, testing_mode: boolean): Wallet {
    log.debug("New wallet. Mnemonic: "+mnemonic+". Testing mode: "+testing_mode+".");
    return new Wallet(mnemonic, mnemonic_to_bip32_root_account(mnemonic, network), network, testing_mode)
  }

  static buildMock(network: Network): Wallet {
    var wallet = Wallet.fromMnemonic('praise you muffin lion enable neck grocery crumble super myself license ghost', network, true);
    // add some statecoins
    let proof_key1 = wallet.genProofKey().publicKey.toString("hex"); // Generate new proof key
    let proof_key2 = wallet.genProofKey().publicKey.toString("hex"); // Generate new proof key
    let uuid1 = uuidv4();
    let uuid2 = uuidv4();
    wallet.addStatecoinFromValues(uuid1, dummy_master_key, 10000, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", proof_key1, ACTION.DEPOSIT)
    wallet.addStatecoinFromValues(uuid2, dummy_master_key, 20000, "5c2cf407970d7213f2b4289901958f2978e3b2fe3ef6aca531316cdcf347cc41", proof_key2, ACTION.DEPOSIT)
    wallet.activity.addItem(uuid2, ACTION.TRANSFER);
    return wallet
  }

  // generate wallet with random mnemonic
  static buildFresh(testing_mode: true, network: Network): Wallet {
    const mnemonic = bip39.generateMnemonic();
    return Wallet.fromMnemonic(mnemonic, network, testing_mode);
  }

  // Load wallet from JSON
  static fromJSON(str_wallet: string, network: Network, addressFunction: Function, testing_mode: boolean): Wallet {
    let json_wallet: Wallet = JSON.parse(str_wallet);

    let new_wallet = new Wallet(json_wallet.mnemonic, json_wallet.account, network, testing_mode);
    new_wallet.statecoins = StateCoinList.fromJSON(JSON.stringify(json_wallet.statecoins))
    new_wallet.activity = ActivityLog.fromJSON(JSON.stringify(json_wallet.activity))
    new_wallet.config.update(json_wallet.config);

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

    new_wallet.account = new bip32utils.Account(chains)
    return new_wallet
  }

  // Load wallet from storage
  static async load(
    {file_path = WALLET_LOC, network = bitcoin.networks.bitcoin, addressFunction = segwitAddr, testing_mode}:
    {file_path?: string, network?: Network, addressFunction?: Function, testing_mode: boolean}
  ) {
    // Fetch raw json
    let str_wallet: string = await new Promise((resolve,_reject) => {
          fsLibrary.readFile(file_path, (error: any, txtString: String) => {
            if (error) throw Error(error);
            resolve(txtString.toString())
          });
      });
    return Wallet.fromJSON(str_wallet, network, addressFunction, testing_mode)
  }

  // Load wallet to storage
  save({file_path = WALLET_LOC}: {file_path?: string}={}) {
    // Store in file as JSON string
    fsLibrary.writeFile(file_path, JSON.stringify(this), (error: any) => {
      if (error) throw Error(error);
    })
  };

  // Initialise and return Wasm object.
  // Wasm contains all wallet Rust functionality.
  // MockWasm is for Jest testing since we cannot run webAssembly with browser target in Jest's Node environment
  async getWasm() {
    let wasm;
    if (this.config.jest_testing_mode) {
      wasm = new MockWasm()
    } else {
      wasm = await import('client-wasm');
    }

    // Setup
    wasm.init();

    return wasm
  }


  // Getters
  getMnemonic(): string {
    return this.mnemonic
  }
  getUnspentStatecoins() {
    return this.statecoins.getUnspentCoins()
  }
  getUnconfirmedStatecoins() {
    return this.statecoins.getUnconfirmedCoins()
  }
  // ActivityLog data with relevant Coin data
  getActivityLog(depth: number) {
    return this.activity.getItems(depth).map((item: ActivityLogItem) => {
      let coin = this.statecoins.getCoin(item.statecoin_id) // should err here if no coin found
      return {
        date: item.date,
        action: item.action,
        value: coin ? coin.value : "",
        funding_txid: coin? coin.funding_txid: ""
      }
    })
  }

  // Add confirmed Statecoin to wallet
  addStatecoin(statecoin: StateCoin, action: string) {
    this.statecoins.addCoin(statecoin);
    this.activity.addItem(statecoin.shared_key_id, action);
    log.debug("Added Statecoin: "+statecoin.shared_key_id);
  }
  addStatecoinFromValues(id: string, shared_key: MasterKey2, value: number, txid: string, proof_key: string, action: string) {
    let statecoin = new StateCoin(id, shared_key);
    statecoin.proof_key = proof_key;
    statecoin.value = value;
    statecoin.funding_txid = txid;
    statecoin.confirmed = true;
    this.statecoins.addCoin(statecoin)
    this.activity.addItem(id, action);
    log.debug("Added Statecoin: "+statecoin.shared_key_id);
  }
  // Mark statecoin as spent after transfer or withdraw
  setStateCoinSpent(id: string, action: string) {
    this.statecoins.setCoinSpent(id)
    this.activity.addItem(id, action);
    log.debug("Set Statecoin spent: "+id);

  }

  // New BTC address
  genBtcAddress(): string {
    let addr = this.account.nextChainAddress(0);
    log.debug("Gen BTC address: "+addr);
    return addr
  }
  getBIP32forBtcAddress(addr: string): BIP32Interface {
    return this.account.derive(addr)
  }

  // New Proof Key
  genProofKey(): BIP32Interface {
    let addr = this.account.nextChainAddress(0);
    let proof_key = this.account.derive(addr);
    log.debug("Gen proof key. Address: "+addr+". Proof key: "+proof_key.publicKey.toString("hex"));
    return proof_key
  }
  getBIP32forProofKeyPubKey(proof_key: string): BIP32Interface {
    const p2wpkh = pubKeyTobtcAddr(proof_key, this.config.network)
    return this.getBIP32forBtcAddress(p2wpkh)
  }

  // Initialise deposit
  async depositInit(value: number) {
    log.info("Depositing Init. "+fromSatoshi(value) + " BTC");
    let proof_key_bip32 = this.genProofKey(); // Generate new proof key
    let proof_key_pub = proof_key_bip32.publicKey.toString("hex")
    let proof_key_priv = proof_key_bip32.privateKey!.toString("hex")

    // Initisalise deposit - gen shared keys and create statecoin
    let statecoin = await depositInit(
      this.http_client,
      await this.getWasm(),
      proof_key_pub,
      proof_key_priv!
    );
    // add proof key bip32 derivation to statecoin
    statecoin.proof_key = proof_key_pub;

    statecoin.value = value;
    this.addStatecoin(statecoin, ACTION.DEPOSIT);

    // Co-owned key address to send funds to (P_addr)
    let p_addr = statecoin.getBtcAddress(this.config.network);

    log.info("Deposite Init done. Send coins to "+p_addr);
    return [statecoin.shared_key_id, p_addr]
  }

  // Confirm deposit after user has sent funds to p_addr, or send funds to wallet for building of funding_tx.
  // Either way, enter confirmed funding txid here to conf with StateEntity and complete deposit
  async depositConfirm(
    shared_key_id: string,
    funding_txid: string,
  ): Promise<StateCoin> {
    log.info("Depositing Confirm shared_key_id: "+shared_key_id);

    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (statecoin === undefined) throw Error("Coin "+shared_key_id+" does not exist.");
    if (statecoin.confirmed) throw Error("Coin "+shared_key_id+" already confirmed.");

    // Add funding_txid to statecoin
    statecoin.funding_txid = funding_txid;

    // Finish deposit protocol
    let chaintip_height: number = await this.electrum_client.latestBlockHeight();

    let statecoin_finalized = await depositConfirm(
      this.http_client,
      await this.getWasm(),
      this.config.network,
      statecoin,
      chaintip_height
    );

    // update in wallet
    statecoin_finalized.confirmed = true;
    this.statecoins.setCoinFinalized(statecoin_finalized);

    log.info("Deposite Confirm done.");
    return statecoin_finalized
  }

  // Perform transfer_sender
  // Args: shared_key_id of coin to send and receivers se_addr.
  // Return: transfer_message String to be sent to receiver.
  async transfer_sender(
    shared_key_id: string,
    receiver_se_addr: string
  ): Promise<TransferMsg3> {
    log.info("Transfer Sender for "+shared_key_id)
    // ensure receiver se address is valid
    try { pubKeyTobtcAddr(receiver_se_addr, this.config.network) }
      catch (e) { throw Error("Invlaid receiver address - Should be hexadecimal public key.") }

    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (!statecoin) throw Error("No coin found with id " + shared_key_id)

    let proof_key_der = this.getBIP32forProofKeyPubKey(statecoin.proof_key);

    let transfer_sender = await transferSender(this.http_client, await this.getWasm(), this.config.network, statecoin, proof_key_der, receiver_se_addr)

    // Mark funds as spent in wallet
    this.setStateCoinSpent(shared_key_id, ACTION.TRANSFER);

    log.info("Transfer Sender complete.")
    return transfer_sender;
  }

  // Perform transfer_receiver
  // Args: transfer_messager retuned from sender's TransferSender
  // Return: New wallet coin data
  async transfer_receiver(transfer_msg3: TransferMsg3): Promise<TransferFinalizeData> {
    log.info("Transfer Receiver for statechain "+transfer_msg3.statechain_id)
    let tx_backup = Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);

    // Get SE address that funds are being sent to.
    let back_up_rec_addr = bitcoin.address.fromOutputScript(tx_backup.outs[0].script, this.config.network);
    let rec_se_addr_bip32 = this.getBIP32forBtcAddress(back_up_rec_addr);
    // Ensure backup tx funds are sent to address owned by this wallet
    if (rec_se_addr_bip32 === undefined) throw new Error("Cannot find backup receive address. Transfer not made to this wallet.");
    if (rec_se_addr_bip32.publicKey.toString("hex") !== transfer_msg3.rec_se_addr.proof_key) throw new Error("Backup tx not sent to addr derived from receivers proof key. Transfer not made to this wallet.");

    let batch_data = {};
    let finalize_data = await transferReceiver(this.http_client, transfer_msg3, rec_se_addr_bip32, batch_data)

    // In batch case this step is performed once all other transfers in the batch are complete.
    if (batch_data = {}) {
        // Finalize protocol run by generating new shared key and updating wallet.
        this.transfer_receiver_finalize(finalize_data);
    }

    return finalize_data
  }

  async transfer_receiver_finalize(
    finalize_data: TransferFinalizeData
  ): Promise<StateCoin> {
    log.info("Transfer Finalize for: "+finalize_data.new_shared_key_id)
    let statecoin_finalized = await transferReceiverFinalize(this.http_client, await this.getWasm(), finalize_data);

    // update in wallet
    statecoin_finalized.confirmed = true;
    this.statecoins.addCoin(statecoin_finalized);

    log.info("Transfer Finalize complete.")
    return statecoin_finalized
  }

  // Perform withdraw
  // Args: statechain_id of coin to withdraw
  // Return: Withdraw Tx  (Details to be displayed to user - amount, txid, expect conf time...)
  async withdraw(
    shared_key_id: string,
    rec_addr: string
  ): Promise<Transaction> {
    log.info("Withdrawing "+shared_key_id+" to "+rec_addr);
    // Check address format
    try { bitcoin.address.toOutputScript(rec_addr, this.config.network) }
      catch (e) { throw Error("Invalid Bitcoin address entered.") }

    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (!statecoin) throw Error("No coin found with id " + shared_key_id)

    let proof_key_der = this.getBIP32forProofKeyPubKey(statecoin.proof_key);

    // Perform withdraw with server
    let tx_withdraw = await withdraw(this.http_client, await this.getWasm(), this.config.network, statecoin, proof_key_der, rec_addr);

    // Mark funds as withdrawn in wallet
    this.setStateCoinSpent(shared_key_id, ACTION.WITHDRAW)
    this.statecoins.setCoinWithdrawTx(shared_key_id, tx_withdraw)

    log.info("Withdrawing finished.");

    // Broadcast transcation
    return tx_withdraw
  }

  // Perform swap
  // Args: statechain_id of coin to swap and swap size parameter. Also provide current coin swap_rounds for GUI demos.
  // Return: New wallet coin data
  swap(statechain_id: string, _swap_size: number, swap_rounds: number) {
    return {
      amount: 0.1,
      shared_key_id: "h46w1ueui-438c-87dc-d06054277a5d",
      statechain_id: statechain_id,
      funding_txid: "4aac3d840fbad3cf76843a5d74e2e118b822772c020fe0d3d0f3d73c0662c9be",
      backuptx: "40fbad3cef62c93c06e118b8f62c9b74e276843a5d0f22772c024aac3d8e0d3d0f3d7b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3cef62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce",
      proof_key: "43030ed1524b9660afb44a7ed876aa15c2983ee7dcf5dc7aec2aeffee49cd9b243db99ea404418727260ef40378168bfd6d0d1358d611195f4dbd89015f9b785",
      swap_rounds: swap_rounds + 10,
      time_left: "10"
    }
  }
}


// BIP39 mnemonic -> BIP32 Account
const mnemonic_to_bip32_root_account = (mnemonic: string, network: Network) => {
  if (!bip39.validateMnemonic(mnemonic)) {
    return "Invalid mnemonic"
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, network);

  let i = root.deriveHardened(0)

  let external = i.derive(0)
  let internal = i.derive(1)

  external.keyPair = { network: network };
  internal.keyPair = { network: network };

  // BIP32 Account is made up of two BIP32 Chains.
  let account = new bip32utils.Account([
    new bip32utils.Chain(external, null, segwitAddr),
    new bip32utils.Chain(internal, null, segwitAddr)
  ]);

  return account
}

// Address generation fn
export const segwitAddr = (node: any, _network: Network) => {
  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: node.publicKey,
    network: bitcoin.networks.testnet
  });
  return p2wpkh.address
}


const dummy_master_key = {public:{q:{x:"47dc67d37acf9952b2a39f84639fc698d98c3c6c9fb90fdc8b100087df75bf32",y:"374935604c8496b2eb5ff3b4f1b6833de019f9653be293f5b6e70f6758fe1eb6"},p2:{x:"5220bc6ebcc83d0a1e4482ab1f2194cb69648100e8be78acde47ca56b996bd9e",y:"8dfbb36ef76f2197598738329ffab7d3b3a06d80467db8e739c6b165abc20231"},p1:{x:"bada7f0efb10f35b920ff92f9c609f5715f2703e2c67bd0e362227290c8f1be9",y:"46ce24197d468c50001e6c2aa6de8d9374bb37322d1daf0120215fb0c97a455a"},paillier_pub:{n:"17945609950524790912898455372365672530127324710681445199839926830591356778719067270420287946423159715031144719332460119432440626547108597346324742121422771391048313578132842769475549255962811836466188142112842892181394110210275612137463998279698990558525870802338582395718737206590148296218224470557801430185913136432965780247483964177331993320926193963209106016417593344434547509486359823213494287461975253216400052041379785732818522252026238822226613139610817120254150810552690978166222643873509971549146120614258860562230109277986562141851289117781348025934400257491855067454202293309100635821977638589797710978933"},c_key:"36d7dde4b796a7034fc6cfd75d341b223012720b52a35a37cd8229839fe9ed1f1f1fe7cbcdbc0fa59adbb757bd60a5b7e3067bc49c1395a24f70228cc327d7346b639d4e81bd3cfd39698c58e900f99c3110d6a3d769f75c8f59e7f5ad57009eadb8c6e6c4830c1082ddd84e28a70a83645354056c90ab709325fc6246d505134d4006ef6fec80645493483413d309cb84d5b5f34e28ab6af3316e517e556df963134c09810f754c58b85cf079e0131498f004108733a5f6e6a242c549284cf2df4aede022d03b854c6601210b450bdb1f73591b3f880852f0e9a3a943e1d1fdb8d5c5b839d0906de255316569b703aca913114067736dae93ea721ddd0b26e33cf5b0af67cee46d6a3281d17082a08ab53688734667c641d71e8f69b25ca1e6e0ebf59aa46c0e0a3266d6d1fba8e9f25837a28a40ae553c59fe39072723daa2e8078e889fd342ef656295d8615531159b393367b760590a1325a547dc1eff118bc3655912ac0b3c589e9d7fbc6d244d5860dfb8a5a136bf7b665711bf4e75fe42eb28a168d1ddd5ecf77165a3d4db72fda355c0dc748b0c6c2eada407dba5c1a6c797385e23c050622418be8f3cd393e6acd8a7ea5bd3306aafae75f4def94386f62564fce7a66dc5d99c197d161c7c0d3eea898ca3c5e9fbd7ceb1e3f7f2cb375181cf98f7608d08ed96ef1f98af3d5e2d769ae4211e7d20415677eddd1051"},private:{x2:"34c0b428488ddc6b28e05cee37e7c4533007f0861e06a2b77e71d3f133ddb81b"},chain_code:"0"}
