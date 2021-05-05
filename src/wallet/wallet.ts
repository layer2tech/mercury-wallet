// Main wallet struct storing Keys derivation material and Mercury Statecoins.

import { BIP32Interface, Network, Transaction } from 'bitcoinjs-lib';
import { ACTION, ActivityLog, ActivityLogItem } from './activity_log';
import { ElectrumClient, MockElectrumClient, HttpClient, TorClient, MockHttpClient, StateCoinList,
  MockWasm, StateCoin, pubKeyTobtcAddr, fromSatoshi, STATECOIN_STATUS, BACKUP_STATUS, decryptAES,
  encodeSCEAddress} from './';

import { txCPFPBuild, FEE } from './util';
import { MasterKey2 } from "./mercury/ecdsa"
import { depositConfirm, depositInit } from './mercury/deposit';
import { withdraw } from './mercury/withdraw';
import { TransferMsg3, transferSender, transferReceiver, transferReceiverFinalize, TransferFinalizeData } from './mercury/transfer';
import { SwapGroup, do_swap_poll } from './swap/swap'
import { v4 as uuidv4 } from 'uuid';
import { Config } from './config';
import { Storage } from '../store';
import { groupInfo } from './swap/info_api';
import { addRestoredCoinDataToWallet, recoverCoins } from './recovery';

let bitcoin = require('bitcoinjs-lib');
let bip32utils = require('bip32-utils');
let bip32 = require('bip32');
let bip39 = require('bip39');
let cloneDeep = require('lodash.clonedeep');

// Logger import.
// Node friendly importing required for Jest tests.
declare const window: any;
let log: any;
try {
  log = window.require('electron-log');
} catch (e) {
  log = require('electron-log');
}

// Wallet holds BIP32 key root and derivation progress information.
export class Wallet {
  name: string;
  password: string;
  config: Config;
  version: string;

  mnemonic: string;
  account: any;
  statecoins: StateCoinList;
  activity: ActivityLog;
  http_client: HttpClient | TorClient | MockHttpClient;
  conductor_client: HttpClient | TorClient| MockHttpClient;
  electrum_client: ElectrumClient | MockElectrumClient;
  block_height: number;
  current_sce_addr: string;
  swap_group_info: Map<SwapGroup, number>;

  storage: Storage

  constructor(name: string, password: string, mnemonic: string, account: any, network: Network, testing_mode: boolean) {
    this.name = name;
    this.password = password;
    this.config = new Config(network, testing_mode);
    this.version = require("../../package.json").version

    this.mnemonic = mnemonic;
    this.account = account;
    this.statecoins = new StateCoinList();
    this.swap_group_info = new Map<SwapGroup, number>();
    this.activity = new ActivityLog();
    this.electrum_client = testing_mode ? new MockElectrumClient() : new ElectrumClient(this.config.electrum_config);
      this.conductor_client = new MockHttpClient();
    
    
    
    this.http_client = 
    //this.config.state_entity_endpoint.endsWith(".onion") ? 
      new TorClient(
        this.config.tor_proxy.ip, 
        this.config.tor_proxy.port, 
        this.config.tor_proxy.controlPassword,  
        this.config.tor_proxy.controlPort,
        this.config.state_entity_endpoint);
        // : 
      //new HttpClient(this.config.state_entity_endpoint);
      
    
    this.conductor_client = 
    //this.config.state_entity_endpoint.endsWith(".onion") ?
    /*  
    new TorClient(
        this.config.tor_proxy.ip, 
        this.config.tor_proxy.port, 
        this.config.tor_proxy.controlPassword,  
        this.config.tor_proxy.controlPort,
        this.config.swap_conductor_endpoint);
        // : 
        */
      new HttpClient(this.config.swap_conductor_endpoint);
    
    this.block_height = 0;
    this.current_sce_addr = "";

    this.storage = new Storage();
  }

  // Generate wallet form mnemonic. Testing mode uses mock State Entity and Electrum Server.
  static fromMnemonic(name: string, password: string, mnemonic: string, network: Network, testing_mode: boolean): Wallet {
    log.debug("New wallet named "+name+" created. Testing mode: "+testing_mode+".");
    return new Wallet(name, password, mnemonic, mnemonic_to_bip32_root_account(mnemonic, network), network, testing_mode)
  }

  // Generate wallet with random mnemonic.
  static buildFresh(testing_mode: true, network: Network): Wallet {
    const mnemonic = bip39.generateMnemonic();
    return Wallet.fromMnemonic("test", "", mnemonic, network, testing_mode);
  }

  // Startup wallet with some mock data. Interations with server may fail since data is random.
  static buildMock(network: Network): Wallet {
    var wallet = Wallet.fromMnemonic('mock', '', 'praise you muffin lion enable neck grocery crumble super myself license ghost', network, true);
    // add some statecoins
    let proof_key1 = wallet.genProofKey().publicKey.toString("hex"); // Generate new proof key
    let proof_key2 = wallet.genProofKey().publicKey.toString("hex"); // Generate new proof key
    let uuid1 = uuidv4();
    let uuid2 = uuidv4();
    wallet.addStatecoinFromValues(uuid1, dummy_master_key, 10000, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, proof_key1, ACTION.DEPOSIT)
    wallet.addStatecoinFromValues(uuid2, dummy_master_key, 20000, "5c2cf407970d7213f2b4289901958f2978e3b2fe3ef6aca531316cdcf347cc41", 0, proof_key2, ACTION.DEPOSIT)
    wallet.activity.addItem(uuid2, ACTION.TRANSFER);
    return wallet
  }

  // Load wallet from JSON
  static fromJSON(json_wallet: any, testing_mode: boolean): Wallet {
    let network: Network = json_wallet.config.network;

    let new_wallet = new Wallet(json_wallet.name, json_wallet.password, json_wallet.mnemonic, json_wallet.account, network, testing_mode);

    new_wallet.statecoins = StateCoinList.fromJSON(json_wallet.statecoins)
    new_wallet.activity = ActivityLog.fromJSON(json_wallet.activity)
    new_wallet.config.update(json_wallet.config);
    new_wallet.current_sce_addr = json_wallet.current_sce_addr;

    // Rederive root and root chain keys
    const seed = bip39.mnemonicToSeedSync(json_wallet.mnemonic);
    const root = bip32.fromSeed(seed, network);

    let i = root.deriveHardened(0)
    let external = i.derive(0)
    let internal = i.derive(1)

    // Re-map Account JSON data to root chains
    const chains = json_wallet.account.map(function (j: any) {
      let node;
      if (Object.keys(j.map).length) { // is internal node
        node = external
      } else {
        node = internal
      }

      const chain = new bip32utils.Chain(node, j.k, segwitAddr)
      chain.map = j.map

      chain.addresses = Object.keys(chain.map).sort(function (a, b) {
        return chain.map[a] - chain.map[b]
      })

      return chain
    })

    new_wallet.account = new bip32utils.Account(chains)
    return new_wallet
  }

  // Save entire wallet to storage. Store in file as JSON Object.

  save() {
    let wallet_json = cloneDeep(this)
    this.storage.storeWallet(wallet_json)
  };
  // Update account in storage.
  saveKeys() {
    let account = cloneDeep(this.account)
    this.storage.storeWalletKeys(this.name, account)
  };

  // Update coins list in storage. Store in file as JSON string.
  saveStateCoinsList() {
    this.storage.storeWalletStateCoinsList(this.name, this.statecoins, this.activity);
  };
  // Clear storage.
  clearSave() {
    this.storage.clearWallet(this.name)
    log.info("Wallet cleared.")
  };

  // Load wallet JSON from store
  static load(wallet_name: string, password: string, testing_mode: boolean) {
    let store = new Storage();
    // Fetch raw wallet string
    let wallet_json = store.getWallet(wallet_name);
    if (wallet_json===undefined) throw Error("No wallet called "+wallet_name+" stored.");
    // Decrypt mnemonic
    try {
      wallet_json.mnemonic = decryptAES(wallet_json.mnemonic, password);
    } catch (e) {
      if (e.message==="unable to decrypt data") throw Error("Incorrect password.")
    }
    return Wallet.fromJSON(wallet_json, testing_mode);
  }

  // Recover active statecoins from server. Should be used as a last resort only due to privacy leakage.
  async recoverCoinsFromServer() {
    log.info("Recovering StateCoins from server for mnemonic.");

    let recoveredCoins = await recoverCoins(this);
    if (recoveredCoins.length>0) {
      log.info("Found "+recoveredCoins.length+" StateCoins. Saving to wallet.");
      this.saveKeys();
      addRestoredCoinDataToWallet(this, await this.getWasm(), recoveredCoins);
    } else {
      log.info("No StateCoins found in Server for this mnemonic.");
    }
  }

  // Initialise electum server:
  // Setup subscribe for block height and outstanding initialised deposits
  initElectrumClient(blockHeightCallBack: any) {
    this.electrum_client.connect().then(() => {
      // Continuously update block height
      this.electrum_client.blockHeightSubscribe(blockHeightCallBack).then((item) => {
        blockHeightCallBack([item])
      });
      // Check if any deposit_inits are awaiting funding txs and create listeners if so
      this.statecoins.getInitialisedCoins().forEach((statecoin) => {
        this.awaitFundingTx(
          statecoin.shared_key_id,
          statecoin.getBtcAddress(this.config.network),
          statecoin.value
        )
      })
      // Check if any deposit_inits are awaiting confirmations and mark unconfirmed/confirmed if complete
      this.statecoins.getInMempoolCoins().forEach((statecoin) => {
        let p_addr = statecoin.getBtcAddress(this.config.network)
        this.checkFundingTxListUnspent(
          statecoin.shared_key_id,
          p_addr,
          bitcoin.address.toOutputScript(p_addr, this.config.network),
          statecoin.value
        )
      })
    })
  }


  // Set Wallet.block_height
  setBlockHeight(header_data: any) {
    this.block_height = header_data[0].height;
  }

  genSEAddress() {
    return encodeSCEAddress(this.genProofKey().publicKey.toString('hex'));
  }
  // Gen new SCEAddress and set in this.current_sce_addr
  newSEAddress() {
    this.current_sce_addr = this.genSEAddress()
  }

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
  getMnemonic(): string { return this.mnemonic }
  getBlockHeight(): number { return this.block_height }
  getSEAddress(): string { return this.current_sce_addr }
  getUnspentStatecoins() {
    return this.statecoins.getUnspentCoins(this.getBlockHeight())
  }
  // Each time we get unconfirmed coins call this to check for confirmations
  checkUnconfirmedCoinsStatus(unconfirmed_coins: StateCoin[]) {
    unconfirmed_coins.forEach((statecoin) => {
      if (statecoin.status===STATECOIN_STATUS.UNCONFIRMED &&
        statecoin.getConfirmations(this.block_height) >= this.config.required_confirmations) {
          this.depositConfirm(statecoin.shared_key_id)
      }
    })
  }
  // Get all INITIALISED, IN_MEMPOOL and UNCONFIRMED coins funding tx data
  getUnconfirmedAndUnmindeCoinsFundingTxData() {
    let unconfirmed_coins = this.statecoins.getUnconfirmedCoins()
    this.checkUnconfirmedCoinsStatus(unconfirmed_coins)
    let coins = unconfirmed_coins.concat(this.statecoins.getInitialisedCoins())
    return coins.map((item: StateCoin) => item.getFundingTxInfo(this.config.network, this.block_height))
  }
  //  Get all INITIALISED UNCONFIRMED coins display data
  getUnconfirmedStatecoinsDisplayData() {
    // Check if any awaiting deposits now have sufficient confirmations and can be confirmed
    let unconfirmed_coins = this.statecoins.getUnconfirmedCoins();
    this.checkUnconfirmedCoinsStatus(unconfirmed_coins)
    return unconfirmed_coins.map((item: StateCoin) => item.getDisplayInfo(this.block_height))
  }
  // Get Backup Tx hex and receive private key
  getCoinBackupTxData(shared_key_id: string) {
    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (statecoin===undefined) throw Error("StateCoin does not exist.");
    if (statecoin.status!==STATECOIN_STATUS.AVAILABLE) throw Error("StateCoin is not availble.");

    // Get tx hex
    let backup_tx_data = statecoin.getBackupTxData(this.getBlockHeight());
    //extract receive address private key
    let addr = bitcoin.address.fromOutputScript(statecoin.tx_backup?.outs[0].script, this.config.network);

    let bip32 = this.getBIP32forBtcAddress(addr);

    let priv_key = bip32.privateKey;
    if (priv_key===undefined) throw Error("Backup receive address private key not found.");

    backup_tx_data.priv_key_hex = priv_key.toString("hex");
    backup_tx_data.key_wif = bip32.toWIF();

    if (statecoin.tx_cpfp != null) {
       let fee_rate = (FEE + (backup_tx_data?.output_value ?? 0) - (statecoin.tx_cpfp?.outs[0]?.value ?? 0))/250;
       backup_tx_data.cpfp_status = "Set. Fee rate = "+fee_rate.toString();
    }

    return backup_tx_data
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

  // update statuts of backup transactions and broadcast if neccessary
  updateBackupTxStatus() {

    for (let i=0; i<this.statecoins.coins.length; i++) {
    // check if there is a backup tx yet, if not do nothing
      if (this.statecoins.coins[i].tx_backup == null) {
        continue;
      }
      if (this.statecoins.coins[i].backup_status === BACKUP_STATUS.CONFIRMED ||
        this.statecoins.coins[i].backup_status === BACKUP_STATUS.TAKEN ||
        this.statecoins.coins[i].backup_status === BACKUP_STATUS.SPENT ||
        this.statecoins.coins[i].status === STATECOIN_STATUS.SPENT ||
        this.statecoins.coins[i].status === STATECOIN_STATUS.WITHDRAWN) {
        continue;
      }
      // check locktime
      let blocks_to_locktime = (this?.statecoins?.coins[i]?.tx_backup?.locktime ?? 0) - this.block_height;
      // pre-locktime - do nothing
      if (blocks_to_locktime > 0) {
        this.statecoins.coins[i].setBackupPreLocktime();
        continue;
      // locktime reached
      } else {
        // in mempool - check if confirmed
        if (this.statecoins.coins[i].backup_status === BACKUP_STATUS.IN_MEMPOOL) {
          let txid = this!.statecoins!.coins[i]!.tx_backup!.getId();
          if(txid != null) {
            this.electrum_client.getTransaction(txid).then((tx_data: any) => {
              if(tx_data.confirmations!==undefined && tx_data.confirmations > 0) {
                this.statecoins.coins[i].setBackupConfirmed();
                this.statecoins.coins[i].setExpired();
            }
          })
          }
        } else {
          // broadcast transaction
          let backup_tx = this!.statecoins!.coins[i]!.tx_backup!.toHex();
          this.electrum_client.broadcastTransaction(backup_tx).then((bresponse: any) => {
            if(bresponse.includes('txn-already-in-mempool') || bresponse.length === 64) {
              this.statecoins.coins[i].setBackupInMempool();
            } else if(bresponse.includes('already')) {
              this.statecoins.coins[i].setBackupInMempool();
            } else if(bresponse.includes('confict') || bresponse.includes('missingorspent')) {
              this.statecoins.coins[i].setBackupTaken();
              this.statecoins.coins[i].setExpired();
            }
          });
          // if CPFP present, then broadcast this as well
          if (this.statecoins.coins[i].tx_cpfp != null) {
              let cpfp_tx = this!.statecoins!.coins[i]!.tx_cpfp!.toHex();
              this.electrum_client.broadcastTransaction(cpfp_tx);
          }
        }
      }
    }
  }

  // create CPFP transaction to spend from backup tx
  createBackupTxCPFP(cpfp_data: any) {

    log.info("Add CPFP for "+cpfp_data.selected_coin+" to "+cpfp_data.cpfp_addr);

    // Check address format
    try { bitcoin.address.toOutputScript(cpfp_data.cpfp_addr, this.config.network) }
      catch (e) { throw Error("Invalid Bitcoin address entered.") }

    let statecoin = this.statecoins.getCoin(cpfp_data.selected_coin);
    if (!statecoin) throw Error("No coin found with id " + cpfp_data.selected_coin);

    let fee_rate = parseInt(cpfp_data.fee_rate);
    if (isNaN(fee_rate)) throw Error("Fee rate not an integer");

    let backup_tx_data = this.getCoinBackupTxData(cpfp_data.selected_coin);

    var ec_pair = bitcoin.ECPair.fromWIF(backup_tx_data.key_wif, this.config.network);
    var p2wpkh = bitcoin.payments.p2wpkh({ pubkey: ec_pair.publicKey, network: this.config.network })

    // Construct CPFP tx
    let txb_cpfp = txCPFPBuild(
      this.config.network,
      backup_tx_data.txid!,
      0,
      cpfp_data.cpfp_addr,
      backup_tx_data.output_value!,
      fee_rate,
      p2wpkh,
    );

    // sign tx
    txb_cpfp.sign(0,ec_pair,null!,null!,backup_tx_data.output_value);

    let cpfp_tx = txb_cpfp.build();

    // add CPFP tx to statecoin
    for (let i=0; i<this.statecoins.coins.length; i++) {
      if (this.statecoins.coins[i].shared_key_id === cpfp_data.selected_coin) {
        this.statecoins.coins[i].tx_cpfp = cpfp_tx;
        break;
      }
    }

    return true;
  }

  // Add confirmed Statecoin to wallet
  addStatecoin(statecoin: StateCoin, action: string) {
    this.statecoins.addCoin(statecoin);
    this.activity.addItem(statecoin.shared_key_id, action);
    log.debug("Added Statecoin: "+statecoin.shared_key_id);
  }
  addStatecoinFromValues(id: string, shared_key: MasterKey2, value: number, txid: string, vout: number, proof_key: string, action: string) {
    let statecoin = new StateCoin(id, shared_key);
    statecoin.proof_key = proof_key;
    statecoin.value = value;
    statecoin.funding_txid = txid;
    statecoin.funding_vout = vout;
    statecoin.tx_backup = new Transaction();
    statecoin.setConfirmed();
    this.statecoins.addCoin(statecoin)
    this.activity.addItem(id, action);
    log.debug("Added Statecoin: "+statecoin.shared_key_id);
  }
  removeStatecoin(shared_key_id: string) {
    this.statecoins.removeCoin(shared_key_id, this.config.testing_mode)
  }
  // Mark statecoin as spent after transfer or withdraw
  setStateCoinSpent(id: string, action: string, transfer_msg?: TransferMsg3) {
    this.statecoins.setCoinSpent(id, action, transfer_msg);
    this.activity.addItem(id, action);
    log.debug("Set Statecoin spent: "+id);
  }

  // New BTC address
  genBtcAddress(): string {
    let addr = this.account.nextChainAddress(0);
    this.saveKeys()
    log.debug("Gen BTC address: "+addr);
    return addr
  }

  getBIP32forBtcAddress(addr: string): BIP32Interface {
    return this.account.derive(addr)
  }

  // New Proof Key
  genProofKey(): BIP32Interface {
    let addr = this.account.nextChainAddress(0);
    this.saveKeys()
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

    // Begin task waiting for tx in mempool and update StateCoin status upon success.
    this.awaitFundingTx(statecoin.shared_key_id, p_addr, statecoin.value)

    log.info("Deposit Init done. Waiting for coins sent to "+p_addr);
    this.saveStateCoinsList();
    return [statecoin.shared_key_id, p_addr]
  }

  // Wait for tx to appear in mempool. Mark coin IN_MEMPOOL or UNCONFIRMED when it arrives.
  async awaitFundingTx(shared_key_id: string, p_addr: string, value: number) {
    let p_addr_script = bitcoin.address.toOutputScript(p_addr, this.config.network)
    log.info("Subscribed to script hash for p_addr: ", p_addr);
    this.electrum_client.scriptHashSubscribe(p_addr_script, (_status: any) => {
      log.info("Script hash status change for p_addr: ", p_addr);
        // Get p_addr list_unspent and verify tx
        this.checkFundingTxListUnspent(shared_key_id, p_addr, p_addr_script, value);
    })
  }
  // Query funding txs list unspent and mark coin IN_MEMPOOL or UNCONFIRMED
  async checkFundingTxListUnspent(shared_key_id: string, p_addr: string, p_addr_script: string, value: number) {
    this.electrum_client.getScriptHashListUnspent(p_addr_script).then((funding_tx_data) => {
      for (let i=0; i<funding_tx_data.length; i++) {
        // Verify amount of tx. Ignore if mock electrum
        if (!this.config.testing_mode && funding_tx_data[i].value!==value) {
          log.error("Funding tx for p_addr "+p_addr+" has value "+funding_tx_data[i].value+" expected "+value+".");
          log.error("Setting value of statecoin to "+funding_tx_data[i].value);
          let statecoin = this.statecoins.getCoin(shared_key_id);
          statecoin!.value = funding_tx_data[i].value;
        }
        if (!funding_tx_data[i].height) {
          log.info("Found funding tx for p_addr "+p_addr+" in mempool. txid: "+funding_tx_data[i].tx_hash)
          this.statecoins.setCoinInMempool(shared_key_id, funding_tx_data[i])
          this.saveStateCoinsList()
        } else {
          log.info("Funding tx for p_addr "+p_addr+" mined. Height: "+funding_tx_data[i].height)
          // Set coin UNCONFIRMED.
          this.statecoins.setCoinUnconfirmed(shared_key_id, funding_tx_data[i])
          this.saveStateCoinsList()
          // No longer need subscription
          this.electrum_client.scriptHashUnsubscribe(p_addr_script);
        }
      }
    });

  }

  // Confirm deposit after user has sent funds to p_addr, or send funds to wallet for building of funding_tx.
  // Either way, enter confirmed funding txid here to conf with StateEntity and complete deposit
  async depositConfirm(
    shared_key_id: string
  ): Promise<StateCoin> {
    log.info("Depositing Confirm shared_key_id: "+shared_key_id);

    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (statecoin === undefined) throw Error("Coin "+shared_key_id+" does not exist.");
    if (statecoin.status === STATECOIN_STATUS.AVAILABLE) throw Error("Already confirmed Coin "+shared_key_id+".");
    if (statecoin.status === STATECOIN_STATUS.INITIALISED) throw Error("Awaiting funding transaction for StateCoin "+shared_key_id+".");

    let statecoin_finalized = await depositConfirm(
      this.http_client,
      await this.getWasm(),
      this.config.network,
      statecoin,
      this.block_height
    );

    // update in wallet
    statecoin_finalized.setConfirmed();
    this.statecoins.setCoinFinalized(statecoin_finalized);

    log.info("Deposit Confirm done.");
    this.saveStateCoinsList();
    return statecoin_finalized
  }

  // Perform do_swap
  // Args: shared_key_id of coin to swap.
  async do_swap(
    shared_key_id: string,
  ): Promise<StateCoin | null> {
    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (!statecoin) throw Error("No coin found with id " + shared_key_id);
    if (statecoin.status===STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin "+shared_key_id+" already in swap pool.");
    if (statecoin.status===STATECOIN_STATUS.IN_SWAP) throw Error("Coin "+shared_key_id+" already involved in swap.");
    if (statecoin.status!==STATECOIN_STATUS.AVAILABLE) throw Error("Coin "+shared_key_id+" not available for swap.");

    log.info("Swapping coin: "+shared_key_id);

    let proof_key_der = this.getBIP32forProofKeyPubKey(statecoin.proof_key);
    let new_proof_key_der = this.genProofKey();
    let wasm = await this.getWasm();

    let new_statecoin = await do_swap_poll(this.conductor_client, this.http_client, wasm, this.config.network, statecoin, proof_key_der, this.config.min_anon_set, new_proof_key_der);

    if (new_statecoin==null) {
      statecoin.setConfirmed();
      return null;
    }
    // Mark funds as spent in wallet
    this.setStateCoinSpent(shared_key_id, ACTION.SWAP);

    // update in wallet
    new_statecoin.swap_status = null;
    new_statecoin.setConfirmed();
    this.statecoins.addCoin(new_statecoin);

    log.info("Swap complete for Coin: "+statecoin.shared_key_id+". New statechain_id: "+new_statecoin.shared_key_id);
    this.saveStateCoinsList();
    return new_statecoin;
  }

  getSwapGroupInfo(): Map<SwapGroup, number>{
    return this.swap_group_info;
  }

  async updateSwapGroupInfo() {
    this.swap_group_info = await groupInfo(this.conductor_client);
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
    if (!statecoin) throw Error("No coin found with id " + shared_key_id);
    if (statecoin.status===STATECOIN_STATUS.IN_SWAP) throw Error("Coin "+shared_key_id+" currenlty involved in swap protocol.");
    if (statecoin.status===STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin "+shared_key_id+" waiting in  swap pool. Remove from pool to transfer.");
    if (statecoin.status!==STATECOIN_STATUS.AVAILABLE) throw Error("Coin "+shared_key_id+" not available for Transfer.");

    let proof_key_der = this.getBIP32forProofKeyPubKey(statecoin.proof_key);

    let transfer_sender = await transferSender(this.http_client, await this.getWasm(), this.config.network, statecoin, proof_key_der, receiver_se_addr)

    // Mark funds as spent in wallet
    this.setStateCoinSpent(shared_key_id, ACTION.TRANSFER, transfer_sender);

    log.info("Transfer Sender complete.");
    this.saveStateCoinsList();
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

    let batch_data = null;
    let finalize_data = await transferReceiver(this.http_client, transfer_msg3, rec_se_addr_bip32, batch_data)

    // Finalize protocol run by generating new shared key and updating wallet.
    this.transfer_receiver_finalize(finalize_data);

    this.saveStateCoinsList();
    return finalize_data
  }

  async transfer_receiver_finalize(
    finalize_data: TransferFinalizeData
  ): Promise<StateCoin> {
    log.info("Transfer Finalize for: "+finalize_data.new_shared_key_id)
    let statecoin_finalized = await transferReceiverFinalize(this.http_client, await this.getWasm(), finalize_data);

    // update in wallet
    statecoin_finalized.setConfirmed();
    this.statecoins.addCoin(statecoin_finalized);

    log.info("Transfer Finalize complete.")
    this.saveStateCoinsList();
    return statecoin_finalized
  }

  // Perform withdraw
  // Args: statechain_id of coin to withdraw
  // Return: Withdraw Tx  (Details to be displayed to user - amount, txid, expect conf time...)
  async withdraw(
    shared_key_ids: string[],
    rec_addr: string
  ): Promise<Transaction> {
    log.info("Withdrawing "+shared_key_ids+" to "+rec_addr);

    // Check address format
    try { bitcoin.address.toOutputScript(rec_addr, this.config.network) }
      catch (e) { throw Error("Invalid Bitcoin address entered.") }

    let statecoins : StateCoin[] = [];
    let proof_key_ders: BIP32Interface[] = [];
    shared_key_ids.forEach( (shared_key_id) => {
      let statecoin = this.statecoins.getCoin(shared_key_id);
      if (!statecoin) throw Error("No coin found with id " + shared_key_id)
      if (statecoin.status===STATECOIN_STATUS.IN_SWAP) throw Error("Coin "+shared_key_id+" currenlty involved in swap protocol.");
      if (statecoin.status===STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin "+shared_key_id+" waiting in  swap pool. Remove from pool to withdraw.");
      if (statecoin.status!==STATECOIN_STATUS.AVAILABLE) throw Error("Coin "+shared_key_id+" not available for withdraw.");
      statecoins.push(statecoin);
      proof_key_ders.push(this.getBIP32forProofKeyPubKey(statecoin.proof_key));
    });
    
    // Perform withdraw with server
    let tx_withdraw = await withdraw(this.http_client, await this.getWasm(), this.config.network, statecoins, proof_key_ders, rec_addr);

    // Mark funds as withdrawn in wallet
    shared_key_ids.forEach( (shared_key_id) => {
      this.setStateCoinSpent(shared_key_id, ACTION.WITHDRAW)
      this.statecoins.setCoinWithdrawTx(shared_key_id, tx_withdraw)
    });

    // Broadcast transcation
    await this.electrum_client.broadcastTransaction(tx_withdraw.toHex())

    log.info("Withdrawing finished.");
    this.saveStateCoinsList();
    return tx_withdraw
  }
}


// BIP39 mnemonic -> BIP32 Account
const mnemonic_to_bip32_root_account = (mnemonic: string, network: Network) => {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw Error("Invalid mnemonic")
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, network);

  let i = root.deriveHardened(0)

  let external = i.derive(0)
  let internal = i.derive(1)

  // BIP32 Account is made up of two BIP32 Chains.
  let account = new bip32utils.Account([
    new bip32utils.Chain(external, null, segwitAddr),
    new bip32utils.Chain(internal, null, segwitAddr)
  ]);

  return account
}

// Address generation fn
export const segwitAddr = (node: any, network: Network) => {
  network = network===undefined ? node.network : network
  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: node.publicKey,
    network: network
  });
  return p2wpkh.address
}



const dummy_master_key = {public:{q:{x:"47dc67d37acf9952b2a39f84639fc698d98c3c6c9fb90fdc8b100087df75bf32",y:"374935604c8496b2eb5ff3b4f1b6833de019f9653be293f5b6e70f6758fe1eb6"},p2:{x:"5220bc6ebcc83d0a1e4482ab1f2194cb69648100e8be78acde47ca56b996bd9e",y:"8dfbb36ef76f2197598738329ffab7d3b3a06d80467db8e739c6b165abc20231"},p1:{x:"bada7f0efb10f35b920ff92f9c609f5715f2703e2c67bd0e362227290c8f1be9",y:"46ce24197d468c50001e6c2aa6de8d9374bb37322d1daf0120215fb0c97a455a"},paillier_pub:{n:"17945609950524790912898455372365672530127324710681445199839926830591356778719067270420287946423159715031144719332460119432440626547108597346324742121422771391048313578132842769475549255962811836466188142112842892181394110210275612137463998279698990558525870802338582395718737206590148296218224470557801430185913136432965780247483964177331993320926193963209106016417593344434547509486359823213494287461975253216400052041379785732818522252026238822226613139610817120254150810552690978166222643873509971549146120614258860562230109277986562141851289117781348025934400257491855067454202293309100635821977638589797710978933"},c_key:"36d7dde4b796a7034fc6cfd75d341b223012720b52a35a37cd8229839fe9ed1f1f1fe7cbcdbc0fa59adbb757bd60a5b7e3067bc49c1395a24f70228cc327d7346b639d4e81bd3cfd39698c58e900f99c3110d6a3d769f75c8f59e7f5ad57009eadb8c6e6c4830c1082ddd84e28a70a83645354056c90ab709325fc6246d505134d4006ef6fec80645493483413d309cb84d5b5f34e28ab6af3316e517e556df963134c09810f754c58b85cf079e0131498f004108733a5f6e6a242c549284cf2df4aede022d03b854c6601210b450bdb1f73591b3f880852f0e9a3a943e1d1fdb8d5c5b839d0906de255316569b703aca913114067736dae93ea721ddd0b26e33cf5b0af67cee46d6a3281d17082a08ab53688734667c641d71e8f69b25ca1e6e0ebf59aa46c0e0a3266d6d1fba8e9f25837a28a40ae553c59fe39072723daa2e8078e889fd342ef656295d8615531159b393367b760590a1325a547dc1eff118bc3655912ac0b3c589e9d7fbc6d244d5860dfb8a5a136bf7b665711bf4e75fe42eb28a168d1ddd5ecf77165a3d4db72fda355c0dc748b0c6c2eada407dba5c1a6c797385e23c050622418be8f3cd393e6acd8a7ea5bd3306aafae75f4def94386f62564fce7a66dc5d99c197d161c7c0d3eea898ca3c5e9fbd7ceb1e3f7f2cb375181cf98f7608d08ed96ef1f98af3d5e2d769ae4211e7d20415677eddd1051"},private:{x2:"34c0b428488ddc6b28e05cee37e7c4533007f0861e06a2b77e71d3f133ddb81b"},chain_code:"0"}
