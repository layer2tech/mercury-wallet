// Main wallet struct storing Keys derivation material and Mercury Statecoins.
import { BIP32Interface, Network, Transaction } from 'bitcoinjs-lib';
import { ACTION, ActivityLog, ActivityLogItem } from './activity_log';
import {
  ElectrumClient, MockElectrumClient, HttpClient, MockHttpClient, StateCoinList,
  MockWasm, StateCoin, pubKeyTobtcAddr, fromSatoshi, STATECOIN_STATUS, BACKUP_STATUS, GET_ROUTE, decryptAES,
  encodeSCEAddress
} from './';
import { ElectrsClient } from './electrs'

import { txCPFPBuild, FEE, encryptAES } from './util';
import { MasterKey2 } from "./mercury/ecdsa"
import { depositConfirm, depositInit } from './mercury/deposit';
import { withdraw, withdraw_init, withdraw_duplicate, withdraw_confirm, WithdrawMsg2 } from './mercury/withdraw';
import { TransferMsg3, transferSender, transferReceiver, transferReceiverFinalize, TransferFinalizeData, transferUpdateMsg } from './mercury/transfer';

import { SwapGroup, GroupInfo, SWAP_STATUS } from './swap/swap_utils';
import Swap from './swap/swap';

import { v4 as uuidv4 } from 'uuid';
import { Config } from './config';
import { Storage } from '../store';
import { groupInfo, swapDeregisterUtxo } from './swap/info_api';
import { addRestoredCoinDataToWallet, recoverCoins } from './recovery';

import { AsyncSemaphore } from "@esfx/async-semaphore";
import { delay, FeeInfo, getFeeInfo, pingServer, pingConductor, pingElectrum } from './mercury/info_api';
import { EPSClient } from './eps';
import { getNewTorId, getTorCircuit, getTorCircuitIds, TorCircuit } from './mercury/torcircuit_api';
import { callGetNewTorId } from '../features/WalletDataSlice';
import { Mutex } from 'async-mutex';

const MAX_SWAP_SEMAPHORE_COUNT = 100;
const swapSemaphore = new AsyncSemaphore(MAX_SWAP_SEMAPHORE_COUNT);
const MAX_UPDATE_SWAP_SEMAPHORE_COUNT = 1;
const updateSwapSemaphore = new AsyncSemaphore(MAX_UPDATE_SWAP_SEMAPHORE_COUNT);

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
} catch (e: any) {
  log = require('electron-log');
}

export const MOCK_WALLET_PASSWORD = "mockWalletPassword_1234567890"
export const MOCK_WALLET_NAME = "mock_e4c93acf-2f49-414f-b124-65c882eea7e7"
export const MOCK_WALLET_MNEMONIC = "praise you muffin lion enable neck grocery crumble super myself license ghost"

// The wallet data must contain these fields
export const required_fields = [
  'name', 'mnemonic', 'config', 'account', 'statecoins',
  'activity'
]

export const parseBackupData = (backupData: string) => {
  try {
    const walletJson = JSON.parse(backupData);
    required_fields.forEach((item) => {
      if (walletJson[item] === undefined) {
        throw Error(`invalid: missing field \"${item}\"`)
      }
    })

    return walletJson
  } catch (err: any) {
    throw Error(`parsing wallet backup data: ${err.message}`)
  }
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
  http_client: HttpClient | MockHttpClient;
  electrum_client: ElectrumClient | ElectrsClient | EPSClient | MockElectrumClient;
  block_height: number;
  current_sce_addr: string;
  swap_group_info: Map<SwapGroup, GroupInfo>;
  tor_circuit: TorCircuit[];
  warnings: [{ name: string, show: boolean }];
  ping_server_ms: number | null;
  ping_conductor_ms: number | null;
  ping_electrum_ms: number | null;
  statechain_id_set: Set<string>;
  wasm: any;
  saveMutex: Mutex;

  storage: Storage
  active: boolean;

  constructor(name: string, password: string, mnemonic: string, account: any, config: Config,
    http_client: any = undefined, wasm: any = undefined) {
    this.name = name;
    this.password = password;
    this.config = config;
    this.version = require("../../package.json").version

    this.mnemonic = mnemonic;
    this.account = account;
    this.statecoins = new StateCoinList();
    this.swap_group_info = new Map<SwapGroup, GroupInfo>();

    this.activity = new ActivityLog();

    if (http_client) {
      this.http_client = http_client;
    } else {
      this.http_client = new HttpClient('http://localhost:3001', true);
      this.set_tor_endpoints();
    }

    this.electrum_client = this.newElectrumClient();

    this.block_height = 0;
    this.current_sce_addr = "";

    this.warnings = [{ name: "swap_punishment", show: true }]

    this.storage = new Storage(`wallets/${this.name}/config`);
    this.ping_conductor_ms = null;
    this.ping_server_ms = null;
    this.ping_electrum_ms = null;

    this.statechain_id_set = new Set();

    this.tor_circuit = [];

    this.saveMutex = new Mutex();
    this.active = true
    this.start()
  }

  updateConfig(config_changes: object) {
    let connectionChanged = this.config.update(config_changes)
    this.save()
    return connectionChanged
  }

  async updateTorId() {
    try {
      await getNewTorId(this.http_client);
    } catch (err: any) {
      throw err
    }
  }

  // TODO - add additional checks and error handling
  async updateTorcircuitInfo() {
    try {
      let torcircuit_ids: any[] = await getTorCircuitIds(this.http_client);
      let torcircuit = [];

      //Only get tor circuit info if not already obtained
      let torcircuit_ids_req = []
      let torcircuit_ids_existing = []
      for (var i = 0; i < this.tor_circuit.length; i++) {
        if (torcircuit_ids.indexOf(this.tor_circuit[i].id) >= 0) {
          if (this.tor_circuit[i].ip.length === 0) {
            torcircuit_ids_req.push(this.tor_circuit[i].id)
          } else {
            //Already have data for this circuit - do not re-request
            torcircuit.push(this.tor_circuit[i])
          }
          torcircuit_ids_existing.push(this.tor_circuit[i].id)
        }
      }

      for (var i = 0; i < torcircuit_ids.length; i++) {
        //Unknown tor circuit - request data
        if (torcircuit_ids_existing.indexOf(torcircuit_ids[i]) < 0) {
          torcircuit_ids_req.push(torcircuit_ids[i])
        }
      }


      for (var i = 0; i < torcircuit_ids_req.length; i++) {
        torcircuit.push(await getTorCircuit(this.http_client, torcircuit_ids_req[i]));
      }

      this.tor_circuit = torcircuit;


    } catch (err: any) {
      throw err
    }
  }

  set_tor_endpoints() {
    let electr_ep = this.config.electrum_config.host
    let electr_ep_arr = electr_ep.split(',');
    let electr_port = this.config.electrum_config.port

    if (electr_port) {
      if (Array.isArray(electr_port)) {
        if (electr_port.length !== electr_ep_arr.length) {
          throw new Error("config error: electrum_config.host array length differs from electrum_config.port length")
        }
        for (let i = 0; i < electr_port.length; i++) {
          if (electr_port[i]) {
            electr_ep_arr[i] = electr_ep_arr[i] + `:${electr_port[i]}`
          }
        }
        electr_ep = electr_ep_arr.toString()
      } else {
        electr_ep = electr_ep + `:${electr_port}`
      }
    }

    let endpoints_config = {
      swap_conductor_endpoint: this.config.swap_conductor_endpoint,
      state_entity_endpoint: this.config.state_entity_endpoint,
      electrum_endpoint: electr_ep,
    }
    this.http_client.post('tor_endpoints', endpoints_config);
  }

  // Generate wallet form mnemonic. Testing mode uses mock State Entity and Electrum Server.
  static fromMnemonic(name: string, password: string, mnemonic: string, network: Network, testing_mode: boolean,
    http_client: any = undefined, wasm: any = undefined): Wallet {
    log.debug("New wallet named " + name + " created. Testing mode: " + testing_mode + ".");
    let wallet = new Wallet(name, password, mnemonic, mnemonic_to_bip32_root_account(mnemonic, network),
      new Config(network, testing_mode), http_client, wasm);
    return wallet;
  }

  // Generate wallet with random mnemonic.
  static buildFresh(testing_mode: true, network: Network): Wallet {
    const mnemonic = bip39.generateMnemonic();
    return Wallet.fromMnemonic("test", "", mnemonic, network, testing_mode);
  }

  // Startup wallet with some mock data. Interations with server may fail since data is random.
  static async buildMock(network: Network, http_client: any = undefined, wasm: any = undefined, mnemonic: string | undefined = undefined): Promise<Wallet> {
    mnemonic = mnemonic ? mnemonic : MOCK_WALLET_MNEMONIC;
    var wallet = Wallet.fromMnemonic(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, mnemonic, network, true,
      http_client, wasm);
    // add some statecoins
    let proof_key1 = (await wallet.genProofKey()).publicKey.toString("hex"); // Generate new proof key
    let proof_key2 = (await wallet.genProofKey()).publicKey.toString("hex"); // Generate new proof key
    let uuid1 = uuidv4();
    let uuid2 = uuidv4();
    wallet.addStatecoinFromValues(uuid1, dummy_master_key, 10000, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, proof_key1, ACTION.DEPOSIT)
    wallet.addStatecoinFromValues(uuid2, dummy_master_key, 20000, "5c2cf407970d7213f2b4289901958f2978e3b2fe3ef6aca531316cdcf347cc41", 0, proof_key2, ACTION.DEPOSIT)
    wallet.activity.addItem(uuid2, ACTION.TRANSFER);
    return wallet
  }

  // convert wallet to encrypted JSON with encrypted mnemonic

  toEncryptedJSON() {
    let wallet_json = JSON.parse(JSON.stringify(this))
    wallet_json.mnemonic = encryptAES(this.mnemonic, this.password)
    return wallet_json
  }


  // Load wallet from JSON
  static fromJSON(json_wallet: any, testing_mode: boolean): Wallet {
    let config = new Config(json_wallet.config.network, json_wallet.config.testing_mode);
    config.update(json_wallet.config);
    //Config needs to be included when constructing the wallet
    let new_wallet = new Wallet(json_wallet.name, json_wallet.password, json_wallet.mnemonic, json_wallet.account, config);

    new_wallet.statecoins = StateCoinList.fromJSON(json_wallet.statecoins)
    new_wallet.activity = ActivityLog.fromJSON(json_wallet.activity)

    new_wallet.current_sce_addr = json_wallet.current_sce_addr;

    if (json_wallet.warnings !== undefined) new_wallet.warnings = json_wallet.warnings
    // Make sure properties added to the wallet are handled
    // New properties should not make old wallets break

    new_wallet.account = json_wallet_to_bip32_root_account(json_wallet)
    return new_wallet
  }

  async stop() {
    this.active = false
    let n_semaphores = 0
    while (n_semaphores < MAX_SWAP_SEMAPHORE_COUNT) {
      await swapSemaphore.wait()
      n_semaphores++
    }
    n_semaphores = 0
    while (n_semaphores < MAX_UPDATE_SWAP_SEMAPHORE_COUNT) {
      await updateSwapSemaphore.wait()
      n_semaphores++
    }
    await this.electrum_client.unsubscribeAll()
  }

  async start() {
    swapSemaphore.release(MAX_SWAP_SEMAPHORE_COUNT)
    updateSwapSemaphore.release(MAX_SWAP_SEMAPHORE_COUNT)
  }

  // unload wallet
  async unload() {
    await this.stop()
    await this.save()
  }

  // Save entire wallet to storage. Store in file as JSON Object.

  async save() {
    const release = await this.saveMutex.acquire();
    try {
      this.save_nomutex()
    } finally {
      release();
    }
  };

  save_nomutex() {
    let wallet_json = cloneDeep(this)
    this.storage.storeWallet(wallet_json)
  }

  // Save wallet names in file

  async saveName() {
    const release = await this.saveMutex.acquire();
    try {
      let store = new Storage("wallets/wallet_names")
      //All wallet names in separate store
      store.setName(this.name)
    } finally {
      release();
    }
  }

  // Update account in storage.
  async saveKeys() {
    const release = await this.saveMutex.acquire();
    try {
      let account = cloneDeep(this.account)
      this.storage.storeWalletKeys(this.name, account)
    } finally {
      release()
    }
  };

  // Update coins list in storage. Store in file as JSON string.
  async saveStateCoinsList() {
    const release = await this.saveMutex.acquire();
    try {
      this.storage.storeWalletStateCoinsList(this.name, this.statecoins, this.activity);
    } finally {
      release()
    }
  };
  // Clear storage.
  async clearSave() {
    const release = await this.saveMutex.acquire();
    try {
      this.storage.clearWallet(this.name)
      log.info("Wallet cleared.")
    } finally {
      release()
    }
  };

  isActive(): boolean {
    return this.active
  }

  // Load wallet JSON from store
  static load(wallet_name: string, password: string, testing_mode: boolean) {

    let store = new Storage(`wallets/${wallet_name}/config`);
    // Fetch decrypted wallet json
    let wallet_json = store.getWalletDecrypted(wallet_name, password);
    wallet_json.password = password;
    let wallet = Wallet.fromJSON(wallet_json, testing_mode);
    return wallet;
  }

  // Load wallet JSON from backup file
  static loadFromBackup(wallet_json: any, password: string, testing_mode: boolean) {
    if (!wallet_json) throw Error("Something went wrong with backup file!");
    // Decrypt mnemonic
    try {
      wallet_json.mnemonic = decryptAES(wallet_json.mnemonic, password);
    } catch (e: any) {
      throw Error("Incorrect password.")
    }
    wallet_json.password = password;
    let wallet = Wallet.fromJSON(wallet_json, testing_mode);
    return wallet;
  }
  // Recover active statecoins from server. Should be used as a last resort only due to privacy leakage.
  async recoverCoinsFromServer(gap_limit: number): Promise<number> {
    log.info("Recovering StateCoins from server for mnemonic.");
    let recoveredCoins = await recoverCoins(this, gap_limit);
    const n_recovered = recoverCoins.length
    if (n_recovered > 0) {
      log.info("Found " + recoveredCoins.length + " StateCoins. Saving to wallet.");
      await this.saveKeys();
      await addRestoredCoinDataToWallet(this, await this.getWasm(), recoveredCoins);
    } else {
      log.info("No StateCoins found in Server for this mnemonic.");
    }
    // check for deposits
    for (let i = 0; i < this.statecoins.coins.length; i++) {
      if (this.statecoins.coins[i].status === STATECOIN_STATUS.INITIALISED) {
        console.log(this.statecoins.coins[i]);
        let p_addr = this.statecoins.coins[i].getBtcAddress(this.config.network);
        // Import the BTC address into the wallet if using the electum-personal-server
        await this.importAddress(p_addr)

        // Begin task waiting for tx in mempool and update StateCoin status upon success.
        this.awaitFundingTx(this.statecoins.coins[i].shared_key_id, p_addr, 100000)

        log.info("Deposit Init done. Waiting for coins sent to " + p_addr);
      }
    }

    return n_recovered
  }

  newElectrumClient() {
    //return this.config.testing_mode ? new MockElectrumClient() : new ElectrumClient(this.config.electrum_config);
    if (this.config.testing_mode == true) return new MockElectrumClient()
    if (this.config.electrum_config.type == 'eps') return new EPSClient('http://localhost:3001')
    if (this.config.electrum_config.protocol == 'http') return new ElectrsClient('http://localhost:3001')

    return new ElectrumClient(this.config.electrum_config)
  }

  // Initialise electum server:
  // Setup subscribe for block height and outstanding initialised deposits
  async initElectrumClient(blockHeightCallBack: any) {
    this.electrum_client.connect().then(async () => {
      // Continuously update block height
      this.electrum_client.blockHeightSubscribe(blockHeightCallBack)
      // Get fee info

      let fee_info: FeeInfo

      getFeeInfo(this.http_client).then(async (res) => {
        fee_info = res
        // Check if any deposit_inits are awaiting funding txs and add them to a list if so
        let p_addrs: any = []
        let statecoins: any = []
        this.statecoins.getInitialisedCoins().forEach((statecoin) => {
          this.awaitFundingTx(
            statecoin.shared_key_id,
            statecoin.getBtcAddress(this.config.network),
            statecoin.value
          )
          let p_addr = statecoin.getBtcAddress(this.config.network)
          p_addrs.push(p_addr)
          statecoins.push(statecoin)
        })
        //Import the addresses if using electrum personal server
        this.electrum_client.importAddresses(p_addrs, this.block_height - fee_info.initlock)

        // Create listeners for deposit inits awaiting funding
        for (let i in p_addrs) {
          await this.checkFundingTxListUnspent(
            statecoins[i].shared_key_id,
            p_addrs[i],
            bitcoin.address.toOutputScript(p_addrs[i], this.config.network),
            statecoins[i].value
          )
        }

        // Check if any deposit_inits are in the mempool
        let p_addrs_mp: any = []
        let statecoins_mp: any = []
        this.statecoins.getInMempoolCoins().forEach((statecoin) => {
          p_addrs_mp.push(statecoin.getBtcAddress(this.config.network))
          statecoins_mp.push(statecoin)
        })

        //Import the addresses if using electrum personal server
        this.electrum_client.importAddresses(p_addrs_mp, this.block_height - fee_info.initlock)

        // Create listeners for deposit inits awaiting funding
        for (let i in p_addrs_mp) {
          await this.checkFundingTxListUnspent(
            statecoins_mp[i].shared_key_id,
            p_addrs_mp[i],
            bitcoin.address.toOutputScript(p_addrs_mp[i], this.config.network),
            statecoins_mp[i].value
          ).catch((err: any) => {
            log.info(err);
            return;
          })
        }
      }).catch(err => {
        console.error('Error InitElectrumClient: ', err)

      })
    })
  }


  // Set Wallet.block_height
  setBlockHeight(header_data: any) {
    if (header_data[0]) {
      this.block_height = header_data[0].height
    }
  }

  async genSEAddress() {
    return encodeSCEAddress((await this.genProofKey()).publicKey.toString('hex'));
  }
  // Gen new SCEAddress and set in this.current_sce_addr
  async newSEAddress() {
    this.current_sce_addr = await this.genSEAddress();
    await this.save()
  }

  // Initialise and return Wasm object.
  // Wasm contains all wallet Rust functionality.
  // MockWasm is for Jest testing since we cannot run webAssembly with browser target in Jest's Node environment
  async getWasm() {
    let wasm;
    if (this.config.jest_testing_mode) {
      if (this.wasm !== undefined && this.wasm !== null) {
        return this.wasm
      } else {
        wasm = new MockWasm()
      }
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

  getSEAddress(addr_index: number): Object {
    if (addr_index >= this.account.chains[0].addresses.length) {
      return this.current_sce_addr
    } else {
      let addr = this.account.chains[0].addresses[addr_index];
      // Address at index shown on receive page

      let proofkey = this.getBIP32forBtcAddress(addr).publicKey.toString("hex");
      // Proof key associated with address

      let encoded_sce_address = encodeSCEAddress(proofkey)
      // Encode proof key to generate SC address

      let used = false;
      let coin_status = "";
      let txid_vout = "";
      let count = 0;

      let swapped_list = []
      // keeping a tally of the coin statechain ID prevents double counting

      // Get used addresses
      for (let coin of this.statecoins.coins) {
        if (coin.transfer_msg !== null) {
          if (coin.transfer_msg?.rec_se_addr.tx_backup_addr == addr && coin.status !== "IN_TRANSFER") {
            coin_status = coin.status;
            used = true;
            txid_vout = `${coin.funding_txid}:${coin.funding_vout}`;
            continue
          }
        }

        if (coin.status === "SWAPPED") {

          if (coin.swap_transfer_msg?.rec_se_addr.tx_backup_addr == addr) {
            swapped_list.push(coin.statechain_id)
            //add to swap list
            used = true

            count += 1
            txid_vout = `${coin.funding_txid}:${coin.funding_vout}`
            continue
          }
        }

        if (coin.sc_address === encoded_sce_address) {
          coin_status = "SWAPPED"
          used = true
          if (!swapped_list.includes(coin.statechain_id)) {
            // Prevents double counting
            count += 1
            coin_status = "AVAILABLE"
          }
        }
      }
      return { sce_address: encoded_sce_address, used: used, coin_status: coin_status, count: count, txid_vout: txid_vout }
    }
  }

  getNumSEAddress(): number { return this.account.chains[0].addresses.length }

  showWarning(key: string) {
    const warningObject = this.warnings.filter(w => w.name === key)
    return warningObject[0].show
  }

  async dontShowWarning(key: string) {
    this.warnings.filter(w => w.name === key)[0].show = false
    await this.save()
  }

  getUnspentStatecoins() {
    return this.statecoins.getUnspentCoins(this.block_height);
  }

  getAllStatecoins() {
    return this.statecoins.coins
  }

  // Each time we get unconfirmed coins call this to check for confirmations
  checkReceivedTxStatus(unconfirmed_coins: StateCoin[]) {
    unconfirmed_coins.forEach((statecoin) => {
      // if we have the funding transaction, finalize creation and backup
      if ((statecoin.status === STATECOIN_STATUS.UNCONFIRMED || statecoin.status === STATECOIN_STATUS.IN_MEMPOOL) && statecoin.tx_backup === null && !this.config.testing_mode) {
        if (!statecoin.backup_confirm) {
          this.statecoins.setConfirmingBackup(statecoin.shared_key_id);
          this.depositConfirm(statecoin.shared_key_id)
        }
      }
    })
  }

  // Each time we get unconfirmed coins call this to check for confirmations
  checkWithdrawingTxStatus(withdrawing_coins: StateCoin[]) {
    withdrawing_coins.forEach(async (statecoin) => {
      // if the withdrawal transaction is confirmed, confirm it with the server and update
      // the wallet
      if (statecoin.status === STATECOIN_STATUS.WITHDRAWING) {
        let length = statecoin.tx_withdraw_broadcast.length
        if (length > 0) {
          for (let i = 0; i < length; i++) {
            let broadcast_txid = statecoin.tx_withdraw_broadcast[i].txid
            log.info(`checking withdrawal tx status...`)
            if (broadcast_txid) {
              const tx_confirmed = await this.checkWithdrawalTx(broadcast_txid);
              if (tx_confirmed && tx_confirmed !== null) {
                log.info(`tx confirmed: ${statecoin.withdraw_txid}`)
                if (!this.config.testing_mode) {
                  log.info(`withdrawal tx confirmed!`)
                  let tx_info = statecoin.getWithdrawalBroadcastTxInfo(broadcast_txid)
                  if (tx_info) {
                    log.info(`found tx_info: ${tx_info}, doing withdraw confirm`)
                    await this.withdraw_confirm(tx_info.withdraw_msg_2, broadcast_txid)
                    log.info(`withdraw confirm finished`)
                  }
                }
              }
            }
          };
        } else {
          statecoin.status = STATECOIN_STATUS.WITHDRAWN;
          this.statecoins.setCoinFinalized(statecoin);
        }
      }
    })
  }

  // Each time we get unconfirmed coins call this to check for confirmations
  checkUnconfirmedCoinsStatus(unconfirmed_coins: StateCoin[]) {
    unconfirmed_coins.forEach((statecoin) => {
      if (statecoin.status === STATECOIN_STATUS.UNCONFIRMED &&
        statecoin.getConfirmations(this.block_height) >= this.config.required_confirmations) {
        if (statecoin.tx_backup === null) {
          this.depositConfirm(statecoin.shared_key_id)
        } else {
          statecoin.setConfirmed()
        }
        // update in wallet
        this.statecoins.setCoinFinalized(statecoin);
      }
    })
  }

  // Get all INITIALISED, IN_MEMPOOL and UNCONFIRMED coins funding tx data
  getUnconfirmedAndUnmindeCoinsFundingTxData() {
    let unconfirmed_coins = this.statecoins.getUnconfirmedCoins()
    this.checkReceivedTxStatus(unconfirmed_coins)
    this.checkUnconfirmedCoinsStatus(unconfirmed_coins)
    // let coins = unconfirmed_coins.concat(this.statecoins.getInitialisedCoins())
    return unconfirmed_coins.map((item: StateCoin) => item.getFundingTxInfo(this.config.network, this.block_height))
  }
  //  Get all INITIALISED UNCONFIRMED coins display data
  getUnconfirmedStatecoinsDisplayData() {
    // Check if any awaiting deposits now have sufficient confirmations and can be confirmed
    let unconfirmed_coins = this.statecoins.getUnconfirmedCoins();
    //Get unconfirmed coins

    this.checkUnconfirmedCoinsStatus(unconfirmed_coins)
    //Check if unconfirmed status now changed and change accordingly
    this.updateBackupTxStatus()
    //check if status update required for coins
    let withdrawing_coins = this.statecoins.getWithdrawingCoins()
    this.checkWithdrawingTxStatus(withdrawing_coins);

    unconfirmed_coins = this.statecoins.getUnconfirmedCoins();
    //reload unconfirmed coins

    return unconfirmed_coins.map((item: StateCoin) => item.getDisplayInfo(this.block_height))
  }
  // Get Backup Tx hex and receive private key
  getCoinBackupTxData(shared_key_id: string) {
    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (statecoin === undefined) throw Error("StateCoin does not exist.");
    if (statecoin.status === STATECOIN_STATUS.INITIALISED) throw Error("StateCoin is not availble.");

    // Get tx hex
    let backup_tx_data = statecoin.getBackupTxData(this.block_height);
    //extract receive address private key
    let addr = bitcoin.address.fromOutputScript(statecoin.tx_backup?.outs[0].script, this.config.network);

    let bip32 = this.getBIP32forBtcAddress(addr);

    let priv_key = bip32.privateKey;
    if (priv_key === undefined) throw Error("Backup receive address private key not found.");

    backup_tx_data.priv_key_hex = priv_key.toString("hex");
    backup_tx_data.key_wif = `p2wpkh:${bip32.toWIF()}`;

    if (statecoin.tx_cpfp !== null) {
      let fee_rate = (FEE + (backup_tx_data?.output_value ?? 0) - (statecoin.tx_cpfp?.outs[0]?.value ?? 0)) / 250;
      backup_tx_data.cpfp_status = "Set. Fee rate = " + fee_rate.toString();
    }

    return backup_tx_data
  }

  getActivityLog() {
    return this.activity;
  }

  // ActivityLog data with relevant Coin data
  getActivityLogItems(depth: number) {
    return this.activity.getItems(depth).map((item: ActivityLogItem) => {
      let coin = this.statecoins.getCoin(item.shared_key_id) // should err here if no coin found
      return {
        date: item.date,
        action: item.action,
        value: coin ? coin.value : "",
        funding_txid: coin ? coin.funding_txid : "",
        funding_txvout: coin ? coin.funding_vout : "",
      }
    })
  }

  processTXBroadcastResponse(statecoin: StateCoin, bresponse: string) {
    if (bresponse.includes('txn-already-in-mempool') || bresponse.length === 64) {
      statecoin.setBackupInMempool();
    } else if (bresponse.includes('already') && bresponse.includes('mempool')) {
      statecoin.setBackupInMempool();
    } else if (bresponse.includes('block')) {
      statecoin.setBackupConfirmed();
      this.setStateCoinSpent(statecoin.shared_key_id, ACTION.WITHDRAW);
    } else if (bresponse.includes('conflict') || bresponse.includes('missingorspent') || bresponse.includes('Missing')) {
      statecoin.setBackupTaken();
      this.setStateCoinSpent(statecoin.shared_key_id, ACTION.EXPIRED);
    }
  }

  processTXBroadcastError(statecoin: StateCoin, err: any) {
    if (err.toString().includes('already') && err.toString().includes('mempool')) {
      statecoin.setBackupInMempool();
    } else if (err.toString().includes('already') && err.toString().includes('block')) {
      statecoin.setBackupConfirmed();
      this.setStateCoinSpent(statecoin.shared_key_id, ACTION.WITHDRAW);
    } else if ((err.toString().includes('conflict') || err.toString().includes('missingorspent')) || err.toString().includes('Missing')) {
      statecoin.setBackupTaken();
      this.setStateCoinSpent(statecoin.shared_key_id, ACTION.EXPIRED);
    }
  }

  static backupTxCheckRequired(statecoin: StateCoin): boolean {
    if (statecoin === null || statecoin === undefined) {
      return false
    }
    if (statecoin.tx_backup === null) {
      return false
    }
    if (statecoin.backup_status === BACKUP_STATUS.CONFIRMED ||
      statecoin.backup_status === BACKUP_STATUS.TAKEN ||
      statecoin.backup_status === BACKUP_STATUS.SPENT ||
      statecoin.status === STATECOIN_STATUS.WITHDRAWN ||
      statecoin.status === STATECOIN_STATUS.WITHDRAWING ||
      statecoin.status === STATECOIN_STATUS.IN_TRANSFER ||
      statecoin.status === STATECOIN_STATUS.SWAPPED ||
      statecoin.status === STATECOIN_STATUS.DUPLICATE) {
      return false
    }
    return true
  }

  // Returns true if locktime is reached
  checkLocktime(statecoin: StateCoin): boolean {
    let blocks_to_locktime = (statecoin.tx_backup?.locktime ?? Number.MAX_SAFE_INTEGER) - this.block_height;
    // pre-locktime - update locktime swap limit status
    if (blocks_to_locktime > 0) {
      statecoin.setBackupPreLocktime();
      if (blocks_to_locktime < this.config.swaplimit && statecoin.status === STATECOIN_STATUS.AVAILABLE) {
        statecoin.setSwapLimit();
      }
      return false
      
    } else {
      // locktime reached
      return true
    }
  }

  async checkMempoolTx(statecoin: StateCoin) {
    let txid = statecoin!.tx_backup!.getId();
    if (txid != null) {
      this.electrum_client.getTransaction(txid).then((tx_data: any) => {
        if (tx_data.confirmations !== undefined && tx_data.confirmations > 2) {
          statecoin.setBackupConfirmed();
          this.setStateCoinSpent(statecoin.shared_key_id, ACTION.WITHDRAW)
        }
      })
    }
  }

  async broadcastBackupTx(statecoin: StateCoin) {
    let backup_tx = statecoin!.tx_backup!.toHex();
    this.electrum_client.broadcastTransaction(backup_tx).then((bresponse: any) => {
      console.log(`process broadcast response: ${JSON.stringify(bresponse)}`)
      this.processTXBroadcastResponse(statecoin, bresponse)
    }).catch((err: any) => {
      console.log(`process broadcast error: ${err.toString()}`)
      this.processTXBroadcastError(statecoin, err)
    })
  }

  async broadcastCPFP(statecoin: StateCoin) {
    if (statecoin.tx_cpfp != null) {
      let cpfp_tx = statecoin!.tx_cpfp!.toHex();
      await this.electrum_client.broadcastTransaction(cpfp_tx);
    }
  }

  // update statuts of backup transactions and broadcast if neccessary
  async updateBackupTxStatus() {
    for (let i = 0; i < this.statecoins.coins.length; i++) {
      let statecoin = this.statecoins.coins[i]
      // check if there is a backup tx yet, if not do nothing
      if (Wallet.backupTxCheckRequired(statecoin) === false) {
        continue
      }
      if (this.checkLocktime(statecoin) === true) {
        // set expired
        if (statecoin.status === STATECOIN_STATUS.SWAPLIMIT || statecoin.status === STATECOIN_STATUS.AVAILABLE) {
          this.setStateCoinSpent(statecoin.shared_key_id, ACTION.EXPIRED)
        }
        // in mempool - check if confirmed
        if (statecoin.backup_status === BACKUP_STATUS.IN_MEMPOOL) {
         console.log(`check mempool TX...`)
         await this.checkMempoolTx(statecoin)
        } else {
         await this.broadcastBackupTx(statecoin)
        }
        // if CPFP present, then broadcast this as well
        try{
          await this.broadcastCPFP(statecoin)
        } catch (err: any) {
          log.error(`Error broadcasting CPFP: ${err.toString()}`)
          continue
        }
      }
      await this.saveStateCoinsList();
    }
  }

  // create CPFP transaction to spend from backup tx
  async createBackupTxCPFP(cpfp_data: any) {

    log.info("Add CPFP for " + cpfp_data.selected_coin + " to " + cpfp_data.cpfp_addr);

    // Check address format
    try { bitcoin.address.toOutputScript(cpfp_data.cpfp_addr, this.config.network) }
    catch (e) { throw Error("Invalid Bitcoin address entered.") }

    let statecoin = this.statecoins.getCoin(cpfp_data.selected_coin);
    if (!statecoin) throw Error("No coin found with id " + cpfp_data.selected_coin);

    let fee_rate = parseInt(cpfp_data.fee_rate);
    if (isNaN(fee_rate)) throw Error("Fee rate not an integer");

    let backup_tx_data = this.getCoinBackupTxData(cpfp_data.selected_coin);

    let i_prefix = backup_tx_data.key_wif.search(/:/)
    let wif_prefix = backup_tx_data.key_wif.slice(0, i_prefix);
    if (wif_prefix !== 'p2wpkh') {
      throw Error(`WIF prefix - expected p2wpkh, got ${wif_prefix}`);
    }
    let wif_key = backup_tx_data.key_wif.slice(i_prefix + 1);

    var ec_pair = bitcoin.ECPair.fromWIF(wif_key, this.config.network);
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
    txb_cpfp.sign(0, ec_pair, null!, null!, backup_tx_data.output_value);

    let cpfp_tx = txb_cpfp.build();

    // add CPFP tx to statecoin
    for (let i = 0; i < this.statecoins.coins.length; i++) {
      if (statecoin.shared_key_id === cpfp_data.selected_coin) {
        statecoin.tx_cpfp = cpfp_tx;
        break;
      }
    }
    await this.saveStateCoinsList();
    return true;
  }

  // Add confirmed Statecoin to wallet
  addStatecoin(statecoin: StateCoin, action: string) {
    if (this.statecoins.addCoin(statecoin)) {
      this.activity.addItem(statecoin.shared_key_id, action);
      log.debug("Added Statecoin: " + statecoin.shared_key_id);
    } else {
      log.debug("Replica, did not add Statecoin: " + statecoin.shared_key_id);
    }
  }

  addStatecoinFromValues(id: string, shared_key: MasterKey2, value: number, txid: string, vout: number, proof_key: string, action: string) {
    let statecoin = new StateCoin(id, shared_key);
    statecoin.proof_key = proof_key;
    statecoin.value = value;
    statecoin.funding_txid = txid;
    statecoin.funding_vout = vout;
    statecoin.tx_backup = new Transaction();
    statecoin.setConfirmed();
    if (this.statecoins.addCoin(statecoin)) {
      this.activity.addItem(id, action);
      log.debug("Added Statecoin: " + statecoin.shared_key_id);
    } else {
      log.debug("Replica, did not add Statecoin: " + statecoin.shared_key_id);
    }
  }
  async removeStatecoin(shared_key_id: string) {
    this.statecoins.removeCoin(shared_key_id, this.config.testing_mode)
    await this.saveStateCoinsList()
  }

  getStatecoin(shared_key_id: string) {
    return this.statecoins.getCoin(shared_key_id);
  }

  addDescription(shared_key_id: string, description: string) {
    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (statecoin) statecoin.description = description
  }

  // Returns aggregate sum of statecoin amounts from list of shared key ids
  sumStatecoinValues(shared_key_ids: string[]) {
    let totalSum = 0

    shared_key_ids.map(id => {
      let statecoin = this.getStatecoin(id)
      if (statecoin) {
        totalSum += statecoin.value
      }
    })

    return totalSum
  }

  // Mark statecoin as spent after transfer or withdraw
  async setStateCoinSpent(id: string, action: string, transfer_msg?: TransferMsg3) {
    let statecoin = this.statecoins.getCoin(id);
    if (statecoin && (statecoin.status === STATECOIN_STATUS.AVAILABLE ||
      statecoin.status === STATECOIN_STATUS.SWAPLIMIT ||
      statecoin.status === STATECOIN_STATUS.EXPIRED ||
      statecoin.status === STATECOIN_STATUS.SWAPPED || 
      statecoin.status === STATECOIN_STATUS.DUPLICATE
    )) {
      this.statecoins.setCoinSpent(id, action, transfer_msg);
      this.activity.addItem(id, action);
      log.debug("Set Statecoin spent: " + id);
    }
    await this.saveStateCoinsList()
  }

  setStateCoinAutoSwap(shared_key_id: string) {
    this.statecoins.setAutoSwap(shared_key_id);
  }

  // New BTC address
  async genBtcAddress(): Promise<string> {
    let addr = this.account.nextChainAddress(0);
    await this.saveKeys()
    log.debug("Gen BTC address: " + addr);
    return addr
  }

  getBIP32forBtcAddress(addr: string): BIP32Interface {
    let node = getBIP32forBtcAddress(addr, this.account)
    return node
  }

  // New Proof Key
  async genProofKey(): Promise<BIP32Interface> {
    let addr = this.account.nextChainAddress(0);
    await this.saveKeys()
    let proof_key = this.getBIP32forBtcAddress(addr);
    log.debug("Gen proof key. Address: " + addr + ". Proof key: " + proof_key.publicKey.toString("hex"));
    return proof_key
  }
  getBIP32forProofKeyPubKey(proof_key: string): BIP32Interface {
    const p2wpkh = pubKeyTobtcAddr(proof_key, this.config.network)
    return this.getBIP32forBtcAddress(p2wpkh)
  }

  // Initialise deposit
  async depositInit(value: number) {
    log.info("Depositing Init. " + fromSatoshi(value) + " BTC");

    let proof_key_bip32 = await this.genProofKey(); // Generate new proof key

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

    statecoin.sc_address = encodeSCEAddress(statecoin.proof_key)

    //Coin created and activity list updated
    this.addStatecoin(statecoin, ACTION.INITIATE);

    // Co-owned key address to send funds to (P_addr)
    let p_addr = statecoin.getBtcAddress(this.config.network);

    // Import the BTC address into the wallet if using the electum-personal-server
    await this.importAddress(p_addr)

    // Begin task waiting for tx in mempool and update StateCoin status upon success.
    this.awaitFundingTx(statecoin.shared_key_id, p_addr, statecoin.value)

    log.info("Deposit Init done. Waiting for coins sent to " + p_addr);
    await this.saveStateCoinsList();
    return [statecoin.shared_key_id, p_addr]
  }

  // Wait for tx to appear in mempool. Mark coin IN_MEMPOOL or UNCONFIRMED when it arrives.
  async awaitFundingTx(shared_key_id: string, p_addr: string, value: number) {
    let p_addr_script = bitcoin.address.toOutputScript(p_addr, this.config.network)
    log.info("Subscribed to script hash for p_addr: ", p_addr);
    this.electrum_client.scriptHashSubscribe(p_addr_script, async (_status: any) => {
      log.info("Script hash status change for p_addr: ", p_addr);
      // Get p_addr list_unspent and verify tx
      await this.checkFundingTxListUnspent(shared_key_id, p_addr, p_addr_script, value);
    })
  }

  // Query funding txs list unspent and mark coin IN_MEMPOOL or UNCONFIRMED
  async checkFundingTxListUnspent(shared_key_id: string, p_addr: string, p_addr_script: string, value: number) {
    this.electrum_client.getScriptHashListUnspent(p_addr_script).then(async (funding_tx_data: Array<any>) => {
      for (let i = 0; i < funding_tx_data.length; i++) {
        // Verify amount of tx. Ignore if mock electrum
        if (!this.config.testing_mode && funding_tx_data[i].value !== value) {
          log.error("Funding tx for p_addr " + p_addr + " has value " + funding_tx_data[i].value + " expected " + value + ".");
          log.error("Setting value of statecoin to " + funding_tx_data[i].value);
          let statecoin = this.statecoins.getCoin(shared_key_id);
          statecoin!.value = funding_tx_data[i].value;
        }
        // check if coin txid has changed (due to RBF)
        let coin = this.statecoins.getCoin(shared_key_id);
        if (coin!.backup_confirm) {
          if (coin) {
            if (coin.funding_txid != funding_tx_data[i].tx_hash && coin.value == funding_tx_data[i].value) {
              coin.tx_backup = null;
              coin.backup_confirm = false;
            }
          }
        }
        if (!funding_tx_data[i].height) {
          if (this.statecoins.setCoinInMempool(shared_key_id, funding_tx_data[i]) === true) {
            log.info("Found funding tx for p_addr " + p_addr + " in mempool. txid: " + funding_tx_data[i].tx_hash)
            await this.saveStateCoinsList()
          }
        } else {
          log.info("Funding tx for p_addr " + p_addr + " mined. Height: " + funding_tx_data[i].height)
          // Set coin UNCONFIRMED.
          this.statecoins.setCoinUnconfirmed(shared_key_id, funding_tx_data[i])
          await this.saveStateCoinsList()
          // No longer need subscription
          this.electrum_client.scriptHashUnsubscribe(p_addr_script);
        }
      }
    });
  }

  // check all shared keys to see if there are multiple confirmed deposits and then create coins
  async checkMultipleDeposits(): Promise<number>  {
      let count = 0;

    for (let i = 0; i < this.statecoins.coins.length; i++) {

      if (this.statecoins.coins[i].shared_key_id.slice(-2) === "-R") {
        continue;
      }
      // check if there is a backup tx yet, if not do nothing
      if (this.statecoins.coins[i].tx_backup === null) {
        continue;
      }
      if (!(this.statecoins.coins[i].status === STATECOIN_STATUS.WITHDRAWN ||
        this.statecoins.coins[i].status === STATECOIN_STATUS.WITHDRAWING ||
        this.statecoins.coins[i].status === STATECOIN_STATUS.AVAILABLE)) {
        continue;
      }

      let addr = this.statecoins.coins[i].getBtcAddress(this.config.network);
      let out_script = bitcoin.address.toOutputScript(addr, this.config.network);
      let funding_tx_data = await this.electrum_client.getScriptHashListUnspent(out_script);

      for (let j=0; j<funding_tx_data.length; j++) {
        if (funding_tx_data[j].tx_hash === this.statecoins.coins[i].funding_txid && funding_tx_data[j].tx_pos === this.statecoins.coins[i].funding_vout) {
           continue;
        } else {
            // check that no existing coin exists with this outpoint
            let existing_output = false;
            for (let k = 0; k < this.statecoins.coins.length; k++) {
              if (this.statecoins.coins[k].funding_txid === funding_tx_data[j].tx_hash && this.statecoins.coins[k].funding_vout === funding_tx_data[j].tx_pos) {
                existing_output = true;
                break;
              }
            }

            if (!existing_output) {
              // create new duplicate coin
              let statecoin = new StateCoin(this.statecoins.coins[i].shared_key_id + "-" + j + "-R", this.statecoins.coins[i].shared_key);
              statecoin.proof_key = this.statecoins.coins[i].proof_key;
              statecoin.value = funding_tx_data[j].value;
              statecoin.funding_txid = funding_tx_data[j].tx_hash;
              statecoin.funding_vout = funding_tx_data[j].tx_pos;
              statecoin.tx_backup = new Transaction();
              statecoin.status = STATECOIN_STATUS.DUPLICATE;

              this.statecoins.addCoin(statecoin)
              count = count + 1;
            }
          }
      }
    }
    return count
  }

  // Query withdrawal txs list unspent and mark coin WITHDRAWN
  async checkWithdrawalTx(tx_hash: string): Promise<boolean> {
    try {
      let withdrawal_tx_data: any = await this.electrum_client.getTransaction(tx_hash);
      let status = withdrawal_tx_data?.status;
      if (status && status.confirmed) {
        log.info(`Withdrawal tx ${tx_hash} confirmed`);
        return true
      }
    } catch (err: any) {
      log.error(err);
    }
    return false
  }

  async importAddress(p_addr: string) {
    this.electrum_client.importAddresses([p_addr], -1)
  }

  // Confirm deposit after user has sent funds to p_addr, or send funds to wallet for building of funding_tx.
  // Either way, enter confirmed funding txid here to conf with StateEntity and complete deposit
  async depositConfirm(
    shared_key_id: string
  ): Promise<StateCoin> {

    log.info("Depositing Backup Confirm shared_key_id: " + shared_key_id);

    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (statecoin === undefined) throw Error("Coin " + shared_key_id + " does not exist.");
    if (statecoin.status === STATECOIN_STATUS.AVAILABLE) throw Error("Already confirmed Coin " + statecoin.getTXIdAndOut() + ".");
    if (statecoin.status === STATECOIN_STATUS.INITIALISED) throw Error("Awaiting funding transaction for StateCoin " + statecoin.getTXIdAndOut() + ".");

    // check that blockheight is recent
    // if not, update it
    if (this.block_height < 709862) {
      let header = await this.electrum_client.latestBlockHeader();
      this.setBlockHeight(header);
    }
    if (this.block_height < 709862) throw Error("Block height not updated");

    let statecoin_finalized = await depositConfirm(
      this.http_client,
      await this.getWasm(),
      this.config.network,
      statecoin,
      this.block_height
    );

    // update in wallet
    if (this.config.testing_mode) {
      statecoin_finalized.setConfirmed();
    }
    this.statecoins.setCoinFinalized(statecoin_finalized);

    //Confirm BTC sent to address in ActivityLog
    this.activity.addItem(shared_key_id, ACTION.DEPOSIT)

    log.info("Deposit Backup done.");
    await this.saveStateCoinsList();

    return statecoin_finalized
  }

  setIfNewCoin(
    new_statecoin: StateCoin
  ) {
    let new_coin = true;
    let is_deposited = false;
    let new_statechain_id = new_statecoin.statechain_id;
    this.statecoins.coins.forEach(
      (statecoin) => {
        if (statecoin.statechain_id === new_statechain_id) {
          new_coin = false
          if (statecoin.is_deposited) {
            is_deposited = true
          }
        }
      })
    new_statecoin['is_new'] = new_coin;
    new_statecoin['is_deposited'] = is_deposited;
  }

  // De register coin from swap on server and set statecoin swap data to null
  async deRegisterSwapCoin(
    statecoin: StateCoin,
    force: boolean = false
  ): Promise<void> {
    //Check if statecoin may be removed from swap
    statecoin = this.statecoins.checkRemoveCoinFromSwapPool(statecoin.shared_key_id, force);
    await swapDeregisterUtxo(this.http_client, { id: statecoin.statechain_id });
    //Reset swap data if the coin was deregistered successfully
    await this.removeCoinFromSwapPool(statecoin.shared_key_id, force);
  }

  async removeCoinFromSwapPool(shared_key_id: string, force: boolean = false) {
    this.statecoins.removeCoinFromSwapPool(shared_key_id, force);
    await this.saveStateCoinsList()
  }


  // Perform do_swap
  // Args: shared_key_id of coin to swap.
  async do_swap(
    shared_key_id: string
  ): Promise<StateCoin | null> {
    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (!statecoin) throw Error("No coin found with id " + shared_key_id);

    // check there is no duplicate
    for (let i = 0; i < this.statecoins.coins.length; i++) {      
      if (this.statecoins.coins[i].shared_key_id.slice(-2) === "-R") {
        if (this.statecoins.coins[i].shared_key_id.slice(0,-4) === statecoin.shared_key_id && this.statecoins.coins[i].status === STATECOIN_STATUS.DUPLICATE) {
          throw Error("This coin has a duplicate deposit - this must be withdraw to recover");
        }
      }
    }

    //Always try and resume coins in swap phase 4 so transfer is completed
    if (statecoin.swap_status !== SWAP_STATUS.Phase4) {
      // Checks statecoin is available and not already in swap group
      statecoin.validateSwap()
      await swapSemaphore.wait();
      try {
        await (async () => {
          while (updateSwapSemaphore.count < MAX_UPDATE_SWAP_SEMAPHORE_COUNT) {
            delay(1000);
          }
        });

        await this.deRegisterSwapCoin(statecoin)

      } catch (e: any) {
        if (!e.message.includes("Coin is not in a swap pool")) {
          throw e;
        }
      } finally {
        swapSemaphore.release();
      }

      return await this.resume_swap(statecoin, false)
    } else {
      return await this.resume_swap(statecoin, true)
    }
  }

  // Perform resume_swap
  // Args: shared_key_id of coin to swap.
  async resume_swap(
    statecoin: StateCoin,
    resume: boolean = true,
  ): Promise<StateCoin | null> {

    log.info("Swapping coin: " + statecoin.shared_key_id);

    let proof_key = statecoin?.proof_key
    if (proof_key === undefined || proof_key === null) {
      throw Error(`resume_swap - proof key for statecoin with shared
      key id: ${statecoin.shared_key_id} is ${proof_key}`)
    }
    let proof_key_der
    try {
      proof_key_der = this.getBIP32forProofKeyPubKey(statecoin.proof_key);
    } catch (err: any) {
      throw Error(`resume_swap: proof_key: ${proof_key}: ${err?.message}`)
    }
    let new_proof_key_der = await this.genProofKey();

    statecoin.sc_address = encodeSCEAddress(statecoin.proof_key, this)

    let new_statecoin: StateCoin | null = null;

    await swapSemaphore.wait();
    try {
      await (async () => {
        while (updateSwapSemaphore.count < MAX_UPDATE_SWAP_SEMAPHORE_COUNT) {
          delay(1000);
        }
      });
      let swap = new Swap(this, statecoin, proof_key_der, new_proof_key_der, resume)
      new_statecoin = await swap.do_swap_poll()
    } catch (e: any) {
      this.handleSwapError(e, statecoin)
    } finally {
      return this.doPostSwap(statecoin, new_statecoin)
    }
  }

  handleSwapError(e: any, statecoin: StateCoin) {
    log.info(`Swap not completed for statecoin ${statecoin.getTXIdAndOut()} - ${e} `);
    // Do not delete swap data for statecoins with transfer
    // completed server side
    if ((statecoin?.swap_status !== SWAP_STATUS.Phase4)
      || `${e} `.includes("Transfer batch ended. Timeout")
      || `${e} `.includes("Exiting swap.")) {
      log.info(`Setting swap data to null for statecoin ${statecoin.getTXIdAndOut()}`);
      statecoin.setSwapDataToNull();
    }
  }

  async doPostSwap(statecoin: StateCoin, new_statecoin: StateCoin | null): Promise<StateCoin | null> {
    if (new_statecoin && new_statecoin instanceof StateCoin) {
      this.setIfNewCoin(new_statecoin)
      await this.setStateCoinSpent(statecoin.shared_key_id, ACTION.SWAP)
      new_statecoin.setSwapDataToNull();
    }
    await this.saveStateCoinsList();
    swapSemaphore.release();
    return new_statecoin
  }

  getSwapGroupInfo(): Map<SwapGroup, GroupInfo> {
    return this.swap_group_info;
  }

  getTorcircuitInfo(): TorCircuit[] {
    return this.tor_circuit;
  }

  async updateSwapGroupInfo() {
    groupInfo(this.http_client).catch((err: any) => {
      this.swap_group_info.clear()
      let err_str = typeof err === 'string' ? err : err?.message
      if (err_str && (err_str.includes('Network Error') ||
        err_str.includes('Mercury API request timed out'))) {
        log.warn(JSON.stringify(err))
      } else {
        throw err
      }
    }).then((result) => {
      if (result) {
        this.swap_group_info = result
      } else {
        this.swap_group_info = new Map<SwapGroup, GroupInfo>();
      }
    })
  }

  async updateSpeedInfo(torOnline = true) {
    if (!torOnline) {
      this.ping_server_ms = null
      this.ping_conductor_ms = null
      this.ping_electrum_ms = null
      return
    }
    try {
      this.ping_server_ms = await pingServer(this.http_client)
    } catch (err) {
      this.ping_server_ms = null
    }
    try {
      this.ping_conductor_ms = await pingConductor(this.http_client)
    } catch (err) {
      this.ping_conductor_ms = null
    }
    try {
      this.ping_electrum_ms = await pingElectrum(this.electrum_client)
    } catch (err) {
      this.ping_electrum_ms = null
    }
  }

  getPingConductorms(): number | null {
    return this.ping_conductor_ms
  }

  getPingServerms(): number | null {
    return this.ping_server_ms
  }

  getPingElectrumms(): number | null {
    return this.ping_electrum_ms
  }


  resetSwapStates() {
    // resets swap state to AVAILABLE
    this.statecoins.coins.forEach(
      (statecoin) => {
        // if this statecoin is in a swap on load, set it back to available
        if (statecoin.status === 'IN_SWAP') {
          statecoin.status = 'AVAILABLE';
          statecoin.swap_id = null;
          statecoin.swap_status = null;
          statecoin.ui_swap_status = null;
        }
      }
    )
  }


  disableAutoSwaps() {
    this.statecoins.coins.forEach(
      (statecoin) => {
        statecoin.swap_auto = false;
      }
    )
  }

  // force deregister of all coins in swap and also toggle auto swap off
  // except for in swap phase 4
  async deRegisterSwaps() {
    for (let i = 0; i < this.statecoins.coins.length; i++) {
      let statecoin = this.statecoins.coins[i]
      try {
        await this.deRegisterSwapCoin(statecoin)
      } catch (e: any) {
        if (!(e?.message && e.message.includes("Coin is not in a swap pool"))) {
          throw e
        }
      }
      //REMOVE THIS TRY CATCH
      statecoin.swap_auto = false;
    }
  }

  //If there are no swaps running then set all the statecoin swap data to null
  async updateSwapStatus() {
    //If there are no do_swap processes running then the swap statuses should all be nullified
    await swapSemaphore.wait();
    await updateSwapSemaphore.wait();
    try {
      if (swapSemaphore.count === MAX_SWAP_SEMAPHORE_COUNT - 1) {
        this.statecoins.coins.forEach(
          async (statecoin) => {
            if (statecoin.status === STATECOIN_STATUS.IN_SWAP || statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) {
              if (statecoin && statecoin?.swap_status !== SWAP_STATUS.Phase4) {
                statecoin.setSwapDataToNull();
              } else {
                log.info(`resuming swap for statechain id: ${statecoin.statechain_id}`)
                this.resume_swap(statecoin)
              }
            }
          }
        );
      }
    } finally {
      await this.saveStateCoinsList();
      swapSemaphore.release();
      updateSwapSemaphore.release();
    }
  }

  // Perform transfer_sender
  // Args: shared_key_id of coin to send and receivers se_addr.
  // Return: transfer_message String to be sent to receiver.
  async transfer_sender(
    shared_key_id: string,
    receiver_se_addr: string
  ): Promise<TransferMsg3> {
    log.info("Transfer Sender for " + shared_key_id)
    // ensure receiver se address is valid
    try { pubKeyTobtcAddr(receiver_se_addr, this.config.network) }
    catch (e: any) { throw Error("Invalid receiver address - Should be hexadecimal public key.") }

    let statecoin = this.statecoins.getCoin(shared_key_id);
    if (!statecoin) throw Error("No coin found with id " + shared_key_id);
    if (statecoin.status === STATECOIN_STATUS.IN_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " currenlty involved in swap protocol.");
    if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " waiting in swap pool. Remove from pool to transfer.");
    if (statecoin.status !== STATECOIN_STATUS.AVAILABLE) throw Error("Coin " + statecoin.getTXIdAndOut() + " not available for Transfer.");

    // check there is no duplicate
    for (let i = 0; i < this.statecoins.coins.length; i++) {
      if (this.statecoins.coins[i].shared_key_id.slice(-2) === "-R") {
        if (this.statecoins.coins[i].shared_key_id.slice(0,-4) === statecoin.shared_key_id && this.statecoins.coins[i].status === STATECOIN_STATUS.DUPLICATE) {
          throw Error("This coin has a duplicate deposit - this must be withdraw to recover");
        }
      }
    }

    let proof_key_der = this.getBIP32forProofKeyPubKey(statecoin.proof_key);

    let transfer_sender = await transferSender(this.http_client, await this.getWasm(), this.config.network, statecoin, proof_key_der, receiver_se_addr, false, this)

    await transferUpdateMsg(this.http_client, transfer_sender, false)

    log.info("Transfer Sender complete.");
    await this.saveStateCoinsList();
    return transfer_sender;
  }

  // Perform transfer_receiver
  // Args: transfer_messager retuned from sender's TransferSender
  // Return: New wallet coin data
  async transfer_receiver(transfer_msg3: TransferMsg3): Promise<TransferFinalizeData> {
    let walletcoins = this.statecoins.getCoins(transfer_msg3.statechain_id);

    for (let i = 0; i < walletcoins.length; i++) {
      if (walletcoins[i].status === STATECOIN_STATUS.AVAILABLE) throw new Error("Transfer completed.");
    }

    log.info("Transfer Receiver for statechain " + transfer_msg3.statechain_id);
    let tx_backup = Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);

    // Get SE address that funds are being sent to.
    let back_up_rec_addr = bitcoin.address.fromOutputScript(tx_backup.outs[0].script, this.config.network);
    let rec_se_addr_bip32 = this.getBIP32forBtcAddress(back_up_rec_addr);

    let batch_data = null;
    let finalize_data = await transferReceiver(this.http_client, this.electrum_client, this.config.network, transfer_msg3, rec_se_addr_bip32, batch_data, this.config.required_confirmations, this.block_height, null, null);

    // Finalize protocol run by generating new shared key and updating wallet.
    await this.transfer_receiver_finalize(finalize_data);

    await this.saveStateCoinsList();
    return finalize_data
  }

  async transfer_receiver_finalize(
    finalize_data: TransferFinalizeData
  ): Promise<StateCoin> {
    log.info("Transfer Finalize for: " + finalize_data.new_shared_key_id)
    let statecoin_finalized = await transferReceiverFinalize(this.http_client, await this.getWasm(), finalize_data);
    this.setIfNewCoin(statecoin_finalized)

    //Add statecoin address to coin
    statecoin_finalized.sc_address = encodeSCEAddress(statecoin_finalized.proof_key)

    // update in wallet
    statecoin_finalized.setConfirmed();

    if (this.statecoins.addCoin(statecoin_finalized)) {
      this.activity.addItem(statecoin_finalized.shared_key_id, ACTION.RECEIVED)
      await this.saveStateCoinsList();
      log.info("Transfer Finalize complete.")
    } else {
      log.info("Transfer finalize error: replica coin")
    }
    return statecoin_finalized
  }

  // Query server for any pending transfer messages for the sepcified address index
  // Check for unused proof keys
  async get_transfers(addr_index: number): Promise<string> {
    log.info("Retrieving transfer messages")
    let error_message = ""
    let transfer_data

    let num_transfers = 0;
    let addr = this.account.chains[0].addresses[addr_index];

    let proofkey = this.getBIP32forBtcAddress(addr).publicKey.toString("hex");
    const MAX_RETRIES = 10
    let n_retries = 0
    let transfer_msgs = []

    while (n_retries < MAX_RETRIES) {
      try {
        transfer_msgs = await this.http_client.get(GET_ROUTE.TRANSFER_GET_MSG_ADDR, proofkey);
        break;
      } catch (err: any) {
        n_retries = n_retries + 1
        if (n_retries === MAX_RETRIES) {
          error_message = err.message
          break;
        }
      }
    }

    for (let i = 0; i < transfer_msgs.length; i++) {
      // check if the coin is in the wallet
      let walletcoins = this.statecoins.getCoins(transfer_msgs[i].statechain_id);
      let dotransfer = true;
      for (let j = 0; j < walletcoins.length; j++) {
        if (walletcoins[j].status === STATECOIN_STATUS.AVAILABLE) {
          dotransfer = false;
          break;
        }
      }
      //perform transfer receiver
      if (dotransfer) {
        try {
          n_retries = 0
          while (n_retries < MAX_RETRIES) {
            try {
              transfer_data = await this.transfer_receiver(transfer_msgs[i]);
              break;
            } catch (err: any) {
              n_retries = n_retries + 1
              if (n_retries === MAX_RETRIES) {
                throw err
              }
            }
          }
          num_transfers += 1;
        }
        catch (e: any) {
          error_message = e.message
        }

      }
    }

    //this.activity.addItem(addr, ACTION.RECEIVED);
    return num_transfers + "../.." + error_message
  }

  isBatchMixedPrivacy(shared_key_ids: string[]) {
    let has_private = false;
    let has_deposited = false;
    if (shared_key_ids.length > 1) {
      shared_key_ids.forEach((shared_key_id) => {
        let statecoin = this.statecoins.getCoin(shared_key_id);
        if (!statecoin) throw Error("No coin found with id " + shared_key_id);
        if (statecoin.is_deposited) {
          has_deposited = true;
        }
        if (statecoin.swap_rounds > 0) {
          has_private = true;
        }
      });
      if (has_deposited === has_private) {
        return false
      } else {
        return true
      }
    } else {
      return false
    }
  }

  async withdraw_init(
    shared_key_ids: string[],
    rec_addr: string,
    fee_per_byte: number
  ): Promise<string> {
    log.info("Withdrawing " + shared_key_ids + " to " + rec_addr);

    // Check address format
    try { bitcoin.address.toOutputScript(rec_addr, this.config.network) }
    catch (e) { throw Error("Invalid Bitcoin address entered.") }

    let statecoins: StateCoin[] = [];
    let proof_key_ders: BIP32Interface[] = [];
    let fee_max = -1
    let duplicate = false;
    shared_key_ids.forEach((shared_key_id) => {
      let statecoin = this.statecoins.getCoin(shared_key_id);
      if (!statecoin) throw Error("No coin found with id " + shared_key_id)
      if (statecoin.status === STATECOIN_STATUS.IN_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " currenlty involved in swap protocol.");
      if (statecoin.status === STATECOIN_STATUS.AWAITING_SWAP) throw Error("Coin " + statecoin.getTXIdAndOut() + " waiting in  swap pool. Remove from pool to withdraw.");
      if (statecoin.status !== STATECOIN_STATUS.AVAILABLE && statecoin.status !== STATECOIN_STATUS.SWAPLIMIT && statecoin.status !== STATECOIN_STATUS.WITHDRAWING && statecoin.status !== STATECOIN_STATUS.DUPLICATE) throw Error("Coin " + statecoin.getTXIdAndOut() + " not available for withdraw.");
      statecoins.push(statecoin);
      proof_key_ders.push(this.getBIP32forProofKeyPubKey(statecoin.proof_key));
      if (shared_key_id.slice(-2) === "-R") duplicate = true; 
    });

    if(duplicate) {
      if (shared_key_ids.length > 1) throw Error("Duplicate deposits cannot be batch withdrawn");
      let existing_coin = this.statecoins.getCoin(shared_key_ids[0].slice(0,-4));
      if (existing_coin) {
        if (!(existing_coin.status === STATECOIN_STATUS.WITHDRAWN)) {
          throw Error("Statecoin must be withdrawn before duplicate");
        }
      }
      let tx_withdraw_d = await withdraw_duplicate(this.http_client, await this.getWasm(), this.config.network, statecoins, proof_key_ders, rec_addr, fee_per_byte);
      // Broadcast transcation
      let withdraw_txid: string = ""
      let nTries = 0;
      let maxNTries = 10
      while (true) {
        try {
          withdraw_txid = await this.electrum_client.broadcastTransaction(tx_withdraw_d.toHex())
        } catch (error) {
          nTries = nTries + 1
          if (nTries < maxNTries) {
            log.info(`Transaction broadcast failed with error: ${error}. Retry: ${nTries}`);
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          } else {
            let errMsg = `Transaction broadcast failed with error: ${error} after ${nTries} attempts. Raw Tx: ${tx_withdraw_d.toHex()}`
            log.info(errMsg)
            throw new Error(errMsg)
          }
        }
        break
      }
      this.setStateCoinSpent(shared_key_ids[0], ACTION.WITHDRAW)
      log.info("Withdraw duplicate finished.");
      return withdraw_txid
    }

    //Check that the replacement transaction is a valid one
    let statecoin = this.statecoins.getCoin(shared_key_ids[0]);
    if (!statecoin) throw Error("No coin found with id " + shared_key_ids[0])
    let broadcastTxInfos = statecoin.tx_withdraw_broadcast
    if (broadcastTxInfos.length) {
      fee_max = statecoin.getWithdrawalMaxTxFee()

      if (fee_max > 0) {
        if (fee_max >= fee_per_byte) throw Error(`Requested fee per byte ${fee_per_byte} is not greater than existing fee per byte ${fee_max}`);
        const ids_sorted_1 = shared_key_ids.slice().sort();
        const ids_sorted_2 = broadcastTxInfos[broadcastTxInfos.length - 1].withdraw_msg_2.shared_key_ids.slice().sort();
        if (JSON.stringify(ids_sorted_1) !== JSON.stringify(ids_sorted_2)) {

          let coin_ids: string[] = [];
          // get txids
          ids_sorted_2.forEach((shared_key_id) => {
            let statecoin = this.statecoins.getCoin(shared_key_id);
            if (!statecoin) throw Error("No coin found with id " + shared_key_id)
            coin_ids.push(statecoin.funding_txid + ':' + statecoin.funding_vout.toString());
          });

          throw Error(`Replacement transactions must batch the same coins: ${coin_ids}`)
        }
        if (rec_addr !== broadcastTxInfos[broadcastTxInfos.length - 1].withdraw_msg_2.address) {
          throw Error(`Replacement transaction recipient address does not match`)
        }
      }
    }

    // Perform withdraw init with server
    let [tx_withdraw, withdraw_msg_2] = await withdraw_init(this.http_client, await this.getWasm(), this.config.network, statecoins, proof_key_ders, rec_addr, fee_per_byte);

    // Mark funds as withdrawn in wallet
    shared_key_ids.forEach((shared_key_id) => {
      let statecoin = this.statecoins.getCoin(shared_key_id);
      if (!statecoin) throw Error("No coin found with id " + shared_key_id)
      if (statecoin.status !== STATECOIN_STATUS.WITHDRAWING &&
        statecoin.status !== STATECOIN_STATUS.WITHDRAWN) {
        statecoin.setWithdrawing()
      }
      this.statecoins.setCoinWithdrawBroadcastTx(shared_key_id, tx_withdraw, fee_per_byte, withdraw_msg_2);
      this.activity.addItem(statecoin.shared_key_id, ACTION.WITHDRAWING);
    });
    await this.saveStateCoinsList();

    // Broadcast transcation
    let withdraw_txid: string = ""
    let nTries = 0;
    let maxNTries = 10
    while (true) {
      try {
        withdraw_txid = await this.electrum_client.broadcastTransaction(tx_withdraw.toHex())
      } catch (error) {
        nTries = nTries + 1
        if (nTries < maxNTries) {
          log.info(`Transaction broadcast failed with error: ${error}. Retry: ${nTries}`);
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        } else {
          let errMsg = `Transaction broadcast failed with error: ${error} after ${nTries} attempts. See the withdrawn statecoins list for the raw transaction.`
          log.info(errMsg)
          throw new Error(errMsg)
        }
      }
      break
    }
    log.info("Withdraw init finished.");
    return withdraw_txid
  }

  async withdraw_confirm(
    withdraw_msg_2: WithdrawMsg2,
    txid: string
  ) {
    log.info(` doing withdraw confirm with message: ${JSON.stringify(withdraw_msg_2)}`)
    try {
      withdraw_msg_2.shared_key_ids.forEach((shared_key_id) => {
        this.statecoins.setCoinWithdrawTxId(shared_key_id, txid)
        this.setStateCoinSpent(shared_key_id, ACTION.WITHDRAW)
      });
      await withdraw_confirm(this.http_client, withdraw_msg_2);
    } catch (e) {
      if (`${e}`.includes('No data for id') || `${e}`.includes('No update made')) {
        withdraw_msg_2.shared_key_ids.forEach((shared_key_id) => {
          this.statecoins.setCoinWithdrawTxId(shared_key_id, txid)
          this.setStateCoinSpent(shared_key_id, ACTION.WITHDRAW)
        })
      } else {
        log.error(`withdraw confirm error: ${e}`);
        throw e
      }
    }
  }
}

// BIP39 mnemonic -> BIP32 Account
export const mnemonic_to_bip32_root_account = (mnemonic: string, network: Network) => {
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

export const json_wallet_to_bip32_root_account = (json_wallet: any): object => {
  const network: Network = json_wallet.config.network;
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

  let account = new bip32utils.Account(chains);
  return account
}

// Address generation fn
export const segwitAddr = (node: any, network: Network) => {
  network = !network ? node?.network : network
  let pubkey = node?.publicKey
  if (!pubkey) {
    throw new Error(`wallet::segwitAddr: node.publicKey is ${pubkey}`)
  }
  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: pubkey,
    network: network
  });
  return p2wpkh.address
}

export const getBIP32forBtcAddress = (addr: string, account: any): BIP32Interface => {
  let node = account.derive(addr)
  if (!node) {
    throw Error(`getBIP32forBtcAddress - did not find address ${addr} in wallet.account`)
  }
  return node
}



const dummy_master_key = { public: { q: { x: "47dc67d37acf9952b2a39f84639fc698d98c3c6c9fb90fdc8b100087df75bf32", y: "374935604c8496b2eb5ff3b4f1b6833de019f9653be293f5b6e70f6758fe1eb6" }, p2: { x: "5220bc6ebcc83d0a1e4482ab1f2194cb69648100e8be78acde47ca56b996bd9e", y: "8dfbb36ef76f2197598738329ffab7d3b3a06d80467db8e739c6b165abc20231" }, p1: { x: "bada7f0efb10f35b920ff92f9c609f5715f2703e2c67bd0e362227290c8f1be9", y: "46ce24197d468c50001e6c2aa6de8d9374bb37322d1daf0120215fb0c97a455a" }, paillier_pub: { n: "17945609950524790912898455372365672530127324710681445199839926830591356778719067270420287946423159715031144719332460119432440626547108597346324742121422771391048313578132842769475549255962811836466188142112842892181394110210275612137463998279698990558525870802338582395718737206590148296218224470557801430185913136432965780247483964177331993320926193963209106016417593344434547509486359823213494287461975253216400052041379785732818522252026238822226613139610817120254150810552690978166222643873509971549146120614258860562230109277986562141851289117781348025934400257491855067454202293309100635821977638589797710978933" }, c_key: "36d7dde4b796a7034fc6cfd75d341b223012720b52a35a37cd8229839fe9ed1f1f1fe7cbcdbc0fa59adbb757bd60a5b7e3067bc49c1395a24f70228cc327d7346b639d4e81bd3cfd39698c58e900f99c3110d6a3d769f75c8f59e7f5ad57009eadb8c6e6c4830c1082ddd84e28a70a83645354056c90ab709325fc6246d505134d4006ef6fec80645493483413d309cb84d5b5f34e28ab6af3316e517e556df963134c09810f754c58b85cf079e0131498f004108733a5f6e6a242c549284cf2df4aede022d03b854c6601210b450bdb1f73591b3f880852f0e9a3a943e1d1fdb8d5c5b839d0906de255316569b703aca913114067736dae93ea721ddd0b26e33cf5b0af67cee46d6a3281d17082a08ab53688734667c641d71e8f69b25ca1e6e0ebf59aa46c0e0a3266d6d1fba8e9f25837a28a40ae553c59fe39072723daa2e8078e889fd342ef656295d8615531159b393367b760590a1325a547dc1eff118bc3655912ac0b3c589e9d7fbc6d244d5860dfb8a5a136bf7b665711bf4e75fe42eb28a168d1ddd5ecf77165a3d4db72fda355c0dc748b0c6c2eada407dba5c1a6c797385e23c050622418be8f3cd393e6acd8a7ea5bd3306aafae75f4def94386f62564fce7a66dc5d99c197d161c7c0d3eea898ca3c5e9fbd7ceb1e3f7f2cb375181cf98f7608d08ed96ef1f98af3d5e2d769ae4211e7d20415677eddd1051" }, private: { x2: "34c0b428488ddc6b28e05cee37e7c4533007f0861e06a2b77e71d3f133ddb81b" }, chain_code: "0" }
