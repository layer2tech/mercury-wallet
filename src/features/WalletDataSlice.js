"use strict";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { Wallet, ACTION, STATECOIN_STATUS, Config } from "../wallet";
import {
  getFeeInfo,
  getCoinsInfo,
  pingElectrum,
  pingLightning,
} from "../wallet/mercury/info_api";
import { pingServer as pingConductor } from "../wallet/swap/info_api";
import { pingServer } from "../wallet/mercury/info_api";
import {
  decodeMessage,
  decodeSCEAddress,
  isValidNodeKeyAddress,
  isValidLnInvoice,
} from "../wallet/util";
import { resetIndex } from "../containers/Receive/Receive";

import { v4 as uuidv4 } from "uuid";
import * as bitcoin from "bitcoinjs-lib";
import { mutex } from "../wallet/electrum";
import { SWAP_STATUS, UI_SWAP_STATUS } from "../wallet/swap/swap_utils";
import { handleNetworkError } from "../error";
import WrappedLogger from "../wrapped_logger";
import { NETWORK_TYPE, deleteChannelByAddr } from "../wallet/wallet";
import {
  LDKClient,
  LIGHTNING_GET_ROUTE,
  LIGHTNING_POST_ROUTE,
} from "../wallet/ldk_client";
// import { store } from "../application/reduxStore";

const isEqual = require("lodash").isEqual;

// eslint-disable-next-line
const CLOSED = require("websocket").w3cwebsocket.CLOSED;
// eslint-disable-next-line
const OPEN = require("websocket").w3cwebsocket.OPEN;

let log;
log = new WrappedLogger();

let isTestnet = false;

export const callIsTestnet = () => {
  if (isWalletLoaded()) {
    return wallet.config.electrum_config.host.includes("testnet");
  }
};

export const callGetArgsHasTestnet = async () => {
  // override existing value - SHOULD really be calling set whenever true
  if (require("../settings.json").testing_mode) {
    callSetArgsHasTestnet(true);
  }

  /*
  

  let result = false;
  if (window.electron && window.electron.ipcRenderer) {
    result = await window.electron.ipcRenderer.invoke("testnet-mode");
    callSetArgsHasTestnet(result);
  }*/

  return isTestnet;
};

export const callSetArgsHasTestnet = async (value) => {
  isTestnet = value;
};

export const callGetNetwork = () => {
  if (isWalletLoaded()) {
    console.log("callGetNetwork->", wallet.config.network);
    return wallet.config.network;
  }
};

let wallet;
let testing_mode = require("../settings.json").testing_mode;

export const WALLET_MODE = {
  STATECHAIN: "STATECHAIN",
  LIGHTNING: "LIGHTNING",
};

const DEFAULT_STATE_COIN_DETAILS = {
  show: false,
  coin: {
    value: 0,
    expiry_data: { blocks: "", months: "", days: "" },
    privacy_data: { score_desc: "" },
    tx_hex: null,
    withdraw_tx: null,
  },
};

const initialState = {
  network: 0, // default to testnet
  currentWallet: undefined,
  lightningLoaded: false,
  walletMode: WALLET_MODE.STATECHAIN,
  notification_dialogue: [],
  error_dialogue: { seen: true, msg: "" },
  one_off_msg: { key: "", msg: "", seen: false },
  warning_dialogue: {
    title: "",
    msg: "",
    onConfirm: undefined,
    onHide: undefined,
  },
  showDetails: DEFAULT_STATE_COIN_DETAILS,
  progress: { active: false, msg: "" },
  balance_info: {
    total_balance: null,
    num_coins: null,
    hidden: false,
    channel_balance: null,
  },
  fee_info: { deposit: "NA", withdraw: "NA" },
  ping_server_ms: null,
  ping_conductor_ms: null,
  ping_electrum_ms: null,
  token_init_status: "idle",
  token: { token: { id: "", btc: "", ln: "" }, values: [] },
  token_verify: { spent: true, confirmed: false, status: "idle" },
  ping_lightning_ms: null,
  ping_swap: null,
  ping_server: null,
  filterBy: "default",
  walletLoaded: false,
  depositLoading: false,
  swapRecords: [],
  swapPendingCoins: [],
  inSwapValues: [],
  swapLoad: { join: false, swapCoin: "", leave: false },
  blockHeightLoad: false,
  coinsAdded: 0,
  coinsRemoved: 0,
  torInfo: { online: true, torcircuitData: [], torLoaded: false },
  showWithdrawPopup: false,
  withdraw_txid: "",
  showInvoicePopup: false,
  success_dialogue: {
    msg: "",
  },
  channel_events: [],
  excluded_txids: [],
};

// Check if a wallet is loaded in memory
export const isWalletLoaded = () => {
  return wallet !== undefined && wallet.isActive();
};

export const callUnsubscribeAll = async () => {
  if (isWalletLoaded()) {
    await wallet.unsubscribeAll();
  }
};

export const isWalletActive = () => {
  return isWalletLoaded() && wallet.isActive();
};

export const unloadWallet = () => {
  if (isWalletLoaded()) {
    resetIndex();
    wallet = null;
  }
};

export const stopWallet = async () => {
  if (isWalletActive()) {
    await wallet.stop();
  }
};

export const saveWallet = async () => {
  if (isWalletLoaded()) {
    await wallet.save();
  }
};

export const reloadWallet = async () => {
  let name = wallet.name;
  let password = wallet.password;
  unloadWallet();
  let router = [];
  await walletLoad(name, password, router);
};

export const getWalletName = () => {
  if (wallet) {
    return wallet.name;
  }
};

export const createInvoice = (amtInSats, invoiceExpirysecs, description) => {
  if (isWalletLoaded()) {
    return wallet.createInvoice(amtInSats, invoiceExpirysecs, description);
  }
};

export const updateChannels = (channels) => {
  if (isWalletLoaded()) {
    return wallet.saveChannels(channels);
  }
};

export const callGetChannels = async (wallet_name) => {
  if (isWalletLoaded()) {
    return await wallet.lightning_client.getChannels(wallet_name);
  }
};

export const callGetChannelEvents = async (wallet_name) => {
  if (isWalletLoaded()) {
    return await wallet.lightning_client.getChannelEvents(wallet_name);
  }
};

export const callSetNotificationSeen = async (id) => {
  if (isWalletLoaded()) {
    return await wallet.lightning_client.setNotificationSeen({ id });
  }
};

export const getTotalChannelBalance = () => {
  if (isWalletLoaded()) {
    return wallet.channels.getTotalChannelBalance();
  }
};

//Restart the electrum server if ping fails
async function pingElectrumRestart(force = false) {
  if (isWalletActive() === false) {
    return;
  }
  //If client already started
  if (
    force ||
    !wallet.electrum_client ||
    (await wallet.electrum_client.isClosed())
  ) {
    log.info(`Restarting electrum server`);
    if (wallet.electrum_client) {
      wallet.electrum_client.unsubscribeAll();
      wallet.electrum_client = null;
    }
    mutex.runExclusive(async () => {
      wallet.electrum_client = wallet.newElectrumClient();
      try {
        //init Block height
        await wallet.electrum_client.getLatestBlock(
          setBlockHeightCallBack,
          wallet.electrum_client.endpoint
        );
        wallet.initElectrumClient(setBlockHeightCallBack);
      } catch (err) {
        log.info(`Failed to initialize electrum client: ${err}`);
      }
    });
  }
}

// Keep electrum server connection alive.
export async function callPingElectrumRestart(force = false) {
  try {
    if (isWalletActive() === false) {
      return;
    }
    await pingElectrumRestart(force);
    return wallet.electrum_client.latestBlockHeader();
  } catch (err) {
    log.info(`Failed to restart electum server: ${err}`);
  }
}

// Call back fn updates wallet block_height upon electrum block height subscribe message event.
// This fn must be in scope of the wallet being acted upon
function setBlockHeightCallBack(item) {
  if (wallet) {
    wallet.setBlockHeight(item);
  }
}

export function initActivityLogItems() {
  wallet.initActivityLogItems(10);
}

export async function loadWalletFromMemory(name, password) {
  wallet = await Wallet.load(name, password, testing_mode);
  wallet.resetSwapStates();
  wallet.disableAutoSwaps();
  log.info("Wallet " + name + " loaded from memory. ");

  return wallet;
}

export async function startLightningLDK(wallet) {
  if (wallet === undefined) return;

  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  while (retryCount < maxRetries) {
    try {
      // Firstly, close the LDK if it's open
      await LDKClient.get("/closeLDK", {});

      // Open the LDK based on the network of the wallet
      let networkPostArg = "";
      if (wallet.config.network.bech32 === "tb") {
        networkPostArg = "test";
      } else if (wallet.config.network.bech32 === "bc") {
        networkPostArg = "prod";
      } else if (wallet.config.network.bech32 === "bcrt") {
        networkPostArg = "dev";
      }
      let payload = { network: networkPostArg };
      console.log("sending payload to startLDK:", payload);
      log.info("Trying to start LDK with arguments: " + payload);
      await LDKClient.post("/startLDK", payload);

      // Call the function once immediately
      await connectToPeers(wallet);

      // Regularly reconnect to peers every 60 seconds
      // setInterval(connectToPeers, 60000);

      // Set the node ID
      wallet.nodeId = await LDKClient.get(LIGHTNING_GET_ROUTE.NODE_ID, {});

      // If we reach this point without throwing an error, break the loop
      break;
    } catch (error) {
      console.error("Error occurred during LDK startup:", error);
      retryCount++;
      if (retryCount < maxRetries) {
        console.log("Retrying in " + retryDelay / 1000 + " seconds...");
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
}

export async function connectToPeers(wallet) {
  if (wallet === undefined) return;
  let channelsInfo = await wallet.lightning_client.getChannels(wallet.name);
  let peerInfo = await wallet.lightning_client.getPeers();

  let mergedInfo = channelsInfo.map((channel) => {
    let peer = peerInfo.find((peer) => peer.id === channel.peer_id);
    return {
      ...channel,
      host: peer.host,
      port: peer.port,
      pubkey: peer.pubkey,
    };
  });
  // Connect to peer on an interval loop
  console.log("reconnecting to peer...");
  console.log("mergedInfo.length:", mergedInfo.length);
  // for every channel reconnect to its peer
  for (var i = 0; i < mergedInfo.length; i++) {
    let pubkey = mergedInfo[i].pubkey;
    let host = mergedInfo[i].host;
    let port = mergedInfo[i].port;

    console.log("try to connect to pubkey->", pubkey);

    try {
      await LDKClient.post("/peer/connectToPeer", {
        pubkey,
        host,
        port,
      });
    } catch (error) {
      console.log(error.response.data); // "Error connecting to peer"
    }
  }
  wallet.saveChannels(channelsInfo);
}

// Load wallet from store
export async function walletLoad(name, password, router) {
  wallet = await loadWalletFromMemory(name, password);

  router.push("/home");

  await walletLoadConnection(wallet);
}

export async function callGetLatestBlock() {
  if (isWalletLoaded) {
    try {
      return await wallet.electrum_client.getLatestBlock(
        setBlockHeightCallBack,
        wallet.electrum_client.endpoint
      );
    } catch (e) {
      if (e.message.includes("circuit")) {
        await wallet.electrum_client.new_tor_id();
        return await wallet.electrum_client.getLatestBlock(
          setBlockHeightCallBack,
          wallet.electrum_client.endpoint
        );
      }
    }
  }
}

async function setNetworkEndpoints(wallet, networkType) {
  await wallet.setHttpClient(networkType);
  await wallet.setElectrsClient(networkType);
  await wallet.set_adapter_endpoints();
}

async function initConnectionData(wallet) {
  console.log("init connectoin data");
  await mutex.runExclusive(async () => {
    //init Block height
    await wallet.electrum_client.getLatestBlock(
      setBlockHeightCallBack,
      wallet.electrum_client.endpoint
    );

    //subscribe to block height interval loop
    await wallet.initElectrumClient(setBlockHeightCallBack);

    wallet.updateSwapStatus();

    // get swap group info
    await wallet.updateSwapGroupInfo();
    // await UpdateSpeedInfo(store.dispatch);
  });
}

export async function walletLoadConnection(wallet) {
  if (testing_mode) log.info("Testing mode set.");
  let networkType = wallet.networkType;
  if (!networkType) {
    networkType = NETWORK_TYPE.TOR;
    wallet.networkType = NETWORK_TYPE.TOR;
  }

  // set http & electrs client endpoints and adapter endpoints
  await setNetworkEndpoints(wallet, networkType);

  // de register coins from swaps
  await wallet.deRegisterSwaps(true);

  // get swap group info & block height & set to wallet object
  await initConnectionData(wallet);
}

async function recoverCoins(wallet, gap_limit, gap_start, dispatch) {
  const n_recovered = await wallet.recoverCoinsFromServer(
    gap_limit,
    gap_start,
    dispatch
  );
  dispatch(addCoins(n_recovered));
}

// Create wallet from nmemonic and load wallet. Try restore wallet if set.
export async function walletFromMnemonic(
  dispatch,
  name,
  password,
  mnemonic,
  route_network_type,
  router,
  try_restore,
  gap_limit = undefined,
  gap_start = undefined,
  network = undefined
) {
  dispatch(setProgressComplete({ msg: "" }));
  wallet = Wallet.fromMnemonic(
    name,
    password,
    mnemonic,
    route_network_type,
    network,
    testing_mode
  );
  wallet.resetSwapStates();

  const networkType = wallet.networkType;

  log.info("Wallet " + name + " created.");
  if (testing_mode) log.info("Testing mode set.");
  await mutex.runExclusive(async () => {
    await wallet.setHttpClient(networkType);
    await wallet.setElectrsClient(networkType);
    wallet.initElectrumClient(setBlockHeightCallBack);
    if (try_restore) {
      let recoveryComplete = false;
      let recoveryCount = 8;
      let recoveryError = "";
      while (!recoveryComplete && recoveryCount !== 0) {
        try {
          await recoverCoins(wallet, gap_limit, gap_start, dispatch);
          recoveryComplete = true;
          recoveryError = "";
        } catch (e) {
          recoveryCount -= 1;
          // Lower retry amount by 1
          recoveryError = e;
          // Set Recovery Error msg;
        }
      }
      if (recoveryError !== "") {
        await stopWallet();
        unloadWallet();
        dispatch(setProgressComplete({ msg: "" }));
        dispatch(
          setError({ msg: `Error in Recovery: ${recoveryError.message}` })
        );
        recoveryComplete = true;
        throw recoveryError;
      }
      dispatch(setWalletLoaded({ loaded: true }));
    }
    await callNewSeAddr();
    await wallet.save();
    await wallet.saveName();
    dispatch(setProgressComplete({ msg: "" }));
    router.push("/home");
  });

  return wallet;
}
// Try to decrypt wallet. Throw if invalid password
export const checkWalletPassword = async (password) => {
  await Wallet.load(wallet.name, password);
};

// Create wallet from backup file
export const walletFromJson = async (wallet_json, password) => {
  wallet = await Wallet.loadFromBackup(wallet_json, password, testing_mode);
  wallet.resetSwapStates();
  wallet.disableAutoSwaps();

  const networkType = wallet.networkType;

  log.info("Wallet " + wallet.name + " loaded from backup.");
  if (testing_mode) log.info("Testing mode set.");
  return Promise.resolve().then(() => {
    return mutex
      .runExclusive(async () => {
        await wallet.setHttpClient(networkType);
        await wallet.setElectrsClient(networkType);
        //init Block height
        await wallet.electrum_client.getLatestBlock(
          setBlockHeightCallBack,
          wallet.electrum_client.endpoint
        );

        wallet.initElectrumClient(setBlockHeightCallBack);
        await callNewSeAddr();
        wallet.updateSwapStatus();
        await wallet.save();
        await wallet.saveName();
        return wallet;
      })
      .catch((error) => {
        console.error("Can not load wallet from json!", error);
      });
  });
};

export const callGetAccount = () => {
  if (isWalletLoaded()) {
    return wallet.account;
  }
};

export const callGetPassword = () => {
  if (wallet) {
    return wallet.password;
  }
};

export const callGetMnemonic = () => {
  if (wallet) {
    return wallet.mnemonic;
  }
};

export const callCheckCoins = async () => {
  return wallet.checkMultipleDeposits();
};

// Wallet data gets
export const callGetConfig = (test_wallet = null) => {
  if (test_wallet) {
    // Jest testing: preset wallet
    return test_wallet.config.getConfig();
  } else {
    return wallet.config.getConfig();
  }
};

export const callDeriveXpub = () => {
  return wallet.deriveXpub();
};

export const callProofKeyFromXpub = (xpub, index) => {
  return wallet.deriveProofKeyFromXpub(xpub, index);
};

export const callGetVersion = () => {
  if (isWalletLoaded()) {
    return wallet.version;
  }
};
export const callGetBlockHeight = () => {
  if (isWalletLoaded()) {
    return wallet.getBlockHeight();
  }
};

export const callAddToken = (token, values) => {
  if (isWalletLoaded()) {
    return wallet.addToken(token, values);
  }
};
export const callGetToken = () => {
  if (isWalletLoaded()) {
    return wallet.getToken();
  }
};
export const callGetTokens = () => {
  if (isWalletLoaded()) {
    return wallet.getTokens().reverse();
  }
};

export const callDeleteToken = (token_id) => {
  if (isWalletLoaded()) {
    log.info("Removing token " + token_id + " from wallet.");
    wallet.deleteToken(token_id);
  }
};

export const callSpendToken = (token_id, amount) => {
  if (isWalletLoaded()) {
    log.info("Spending " + amount + " from token " + token_id + ".");
    wallet.spendToken(token_id, amount);
  }
};

export const resetBlockHeight = () => {
  if (isWalletLoaded()) {
    return wallet.resetBlockHeight();
  }
};

export const callGetUnspentStatecoins = () => {
  if (isWalletLoaded()) {
    return wallet.getUnspentStatecoins();
  }
};
export const callGetAllStatecoins = () => {
  if (isWalletLoaded()) {
    return wallet.getAllStatecoins();
  }
};

export const callSumStatecoinValues = (shared_key_ids) => {
  if (isWalletLoaded()) {
    return wallet.sumStatecoinValues(shared_key_ids);
  }
};

export const getChannels = () => {
  if (isWalletLoaded()) {
    return wallet.channels.channels;
  }
};

export const getNodeId = () => {
  if (isWalletLoaded()) {
    return wallet.nodeId;
  }
};

export const callSumChannelAmt = (selectedChannels) => {
  const filteredChannels = wallet.channels.filter((channel) =>
    selectedChannels.includes(channel.id)
  );
  const totalSum = filteredChannels.reduce(
    (sum, currentItem) => sum + currentItem.amount,
    0
  );
  return totalSum;
};

export const callIsBatchMixedPrivacy = (shared_key_ids) => {
  if (isWalletLoaded()) {
    return wallet.isBatchMixedPrivacy(shared_key_ids);
  }
};

export const callGetTorcircuitInfo = () => {
  if (isWalletLoaded()) {
    return wallet.getTorcircuitInfo();
  }
};

export const callGetSwapGroupInfo = () => {
  if (isWalletLoaded()) {
    return wallet.getSwapGroupInfo();
  }
};

export const resetSwapGroupInfo = () => {
  if (isWalletLoaded()) {
    return wallet.resetSwapGroupInfo();
  }
};

export const showWarning = (key) => {
  if (wallet) {
    if (!key) {
      //if no key defined, stop warning popup loading by returning true
      return false;
    }
    return wallet.showWarning(key);
  }
};
export const dontShowWarning = async (key) => {
  if (isWalletLoaded()) {
    await wallet.dontShowWarning(key);
    return;
  }
};

export const callGetUnconfirmedAndUnmindeCoinsFundingTxData = () => {
  if (isWalletLoaded()) {
    return wallet.getUnconfirmedAndUnmindeCoinsFundingTxData();
  }
};
export const callGetUnconfirmedStatecoinsDisplayData = () => {
  if (isWalletLoaded()) {
    return wallet.getUnconfirmedStatecoinsDisplayData();
  }
};

export const callGetActivityLog = () => {
  if (isWalletLoaded()) {
    return wallet.getActivityLog();
  }
};

export const callGetActivityLogItems = () => {
  if (isWalletLoaded()) {
    return wallet.getActivityLogItems();
  }
};

export const callGetSwappedStatecoinsByFundingOutPoint = (
  funding_out_point,
  depth
) => {
  // depth:- last X swaps for a coin with utxo: funding_out_point
  if (isWalletLoaded()) {
    return wallet.getSwappedStatecoinsByFundingOutPoint(
      funding_out_point,
      depth
    );
  }
};

export const callGetActivityDate = (shared_key_id, action) => {
  if (isWalletLoaded()) {
    return wallet.activity.getDate(shared_key_id, action);
  }
};

export const callGetFeeInfo = () => {
  if (isWalletLoaded()) {
    return getFeeInfo(wallet.http_client);
  }
};
export const callGetCoinsInfo = () => {
  if (isWalletLoaded()) {
    return getCoinsInfo(wallet.http_client);
  }
};
export const callPingSwap = () => {
  try {
    return pingConductor(wallet.http_client);
  } catch (error) {
    return null;
  }
};
export const callPingServer = () => {
  try {
    return pingServer(wallet.http_client);
  } catch (error) {
    return null;
  }
};
export const callGetCoinBackupTxData = (shared_key_id) => {
  if (isWalletLoaded()) {
    return wallet.getCoinBackupTxData(shared_key_id);
  }
};

export const callGetNextBtcAddress = async () => {
  if (isWalletLoaded()) {
    return await wallet.genBtcAddress();
  }
};

export const callGetSeAddr = (addr_index) => {
  if (isWalletLoaded() && addr_index >= 0) {
    return wallet.getSEAddress(addr_index);
  }
};
// Gen new SE Address
export const callNewSeAddr = async (state) => {
  if (isWalletLoaded()) {
    return await wallet.newSEAddress();
  }
};
export const callGetNumSeAddr = () => {
  if (isWalletLoaded()) {
    return wallet.getNumSEAddress();
  }
};

// Remove coin from coins list and file
export const callRemoveCoin = async (shared_key_id) => {
  if (isWalletLoaded()) {
    log.info("Removing coin " + shared_key_id + " from wallet.");
    await wallet.removeStatecoin(shared_key_id);
  }
};

export const callGetStateCoin = (shared_key_id) => {
  if (isWalletLoaded()) {
    return wallet.getStatecoin(shared_key_id);
  }
};

export const callAddDescription = (shared_key_id, description) => {
  if (isWalletLoaded()) {
    wallet.addDescription(shared_key_id, description);
  }
};

// Update config with JSON of field to change
export const callUpdateConfig = async (config_changes) => {
  if (isWalletLoaded()) {
    if ((await wallet.updateConfig(config_changes)) === true) {
      await reloadWallet();
    }
  }
};

// Create CPFP transaction and add to coin
export const callCreateBackupTxCPFP = async (cpfp_data) => {
  if (isWalletLoaded()) {
    let sucess = await wallet.createBackupTxCPFP(cpfp_data);
    return sucess;
  }
};

export const callGetWalletJsonToBackup = () => {
  if (isWalletLoaded()) {
    let backup_wallet = wallet.storage.getWallet(wallet.name, true);
    // remove password and root keys
    backup_wallet.password = "";
    return backup_wallet;
  }
};

//Swap Functions
export const checkSwapAvailability = (statecoin, in_swap_values) => {
  if (statecoin?.status !== STATECOIN_STATUS.AVAILABLE) {
    return false;
  }
  if (callGetConfig().singleSwapMode && in_swap_values.has(statecoin?.value)) {
    statecoin.ui_swap_status = UI_SWAP_STATUS.SingleSwapMode;
    return false;
  }
  return true;
};

export const handleEndSwap = (
  dispatch,
  selectedCoin,
  res,
  setSwapLoad,
  swapLoad,
  fromSatoshi
) => {
  if (isWalletActive() === false) {
    dispatch(clearInSwapValues());
    dispatch(clearSwapPendingCoins());
    return;
  }
  dispatch(removeSwapPendingCoin(selectedCoin));
  // get the statecoin for txId method
  let statecoin = callGetStateCoin(selectedCoin);
  dispatch(removeInSwapValue(statecoin.value));
  if (statecoin === undefined || statecoin === null) {
    statecoin = selectedCoin;
  }

  if (res.payload === null) {
    dispatch(
      setNotification({
        msg: "Coin " + statecoin.getTXIdAndOut() + " removed from swap pool.",
      })
    );
    dispatch(removeCoinFromSwapRecords(selectedCoin)); // added this
    if (statecoin.swap_auto) {
      dispatch(addSwapPendingCoin(statecoin.shared_key_id));
      dispatch(addCoinToSwapRecords(statecoin.shared_key_id));
      dispatch(
        setSwapLoad({
          ...swapLoad,
          join: false,
          swapCoin: callGetStateCoin(selectedCoin),
        })
      );
    }

    return;
  }
  if (res.error === undefined) {
    if (res.payload?.is_deposited) {
      dispatch(
        setNotification({
          msg:
            "Warning - received coin in swap that was previously deposited or recovered in this wallet: " +
            statecoin.getTXIdAndOut() +
            " of value " +
            fromSatoshi(res.payload.value),
        })
      );
      dispatch(removeCoinFromSwapRecords(selectedCoin));
    } else {
      dispatch(
        setNotification({
          msg:
            "Swap complete for coin " +
            statecoin.getTXIdAndOut() +
            " of value " +
            fromSatoshi(res.payload.value),
        })
      );
      dispatch(removeCoinFromSwapRecords(selectedCoin));
    }
  } else {
    dispatch(
      setNotification({
        msg: "Swap not complete for statecoin" + statecoin.getTXIdAndOut(),
      })
    );
    dispatch(removeCoinFromSwapRecords(selectedCoin)); // Added this
    dispatch(setSwapLoad({ ...swapLoad, join: false, swapCoin: "" }));
  }
  if (res?.payload) {
    let statecoin = res.payload;
    if (statecoin.swap_auto) {
      dispatch(addSwapPendingCoin(statecoin.shared_key_id));
      dispatch(addCoinToSwapRecords(statecoin.shared_key_id));
      dispatch(
        setSwapLoad({
          ...swapLoad,
          join: false,
          swapCoin: callGetStateCoin(selectedCoin),
        })
      );
    }
  }
};

export const handleEndAutoSwap = (
  dispatch,
  statecoin,
  selectedCoin,
  res,
  fromSatoshi
) => {
  dispatch(removeSwapPendingCoin(selectedCoin));

  // get the statecoin for txId method
  if (statecoin === undefined || statecoin === null) {
    statecoin = selectedCoin;
  }

  if (!statecoin?.swap_auto) {
    // If user switches off swap auto, exit callDoSwap smoothly
    return;
  }

  let new_statecoin = res?.payload;
  dispatch(removeInSwapValue(statecoin.value));
  // turn off autoswap because final .then was called
  if (!new_statecoin) {
    // dispatch(setNotification({msg:"Coin "+statecoin.getTXIdAndOut()+" removed from swap pool, please try again later."}))
    if (statecoin.swap_status === SWAP_STATUS.Phase4) {
      // dispatch(setNotification({msg:"Retrying resume swap phase 4 with statecoin:' + statecoin.shared_key_id"}));
      dispatch(addCoinToSwapRecords(statecoin));
      dispatch(addSwapPendingCoin(statecoin.shared_key_id));
      return;
    } else {
      if (statecoin.swap_auto) {
        // dispatch(setNotification({msg:"Retrying join auto swap with statecoin:' + statecoin.shared_key_id"}));
        dispatch(addCoinToSwapRecords(statecoin));
        dispatch(addSwapPendingCoin(statecoin.shared_key_id));
        //return
      }
    }
  } else {
    if (new_statecoin?.is_deposited) {
      dispatch(
        setNotification({
          msg:
            "Swap complete - Warning - received coin in swap that was previously deposited or recovered in this wallet: " +
            statecoin.getTXIdAndOut() +
            " of value " +
            fromSatoshi(res.payload.value),
        })
      );
      dispatch(removeCoinFromSwapRecords(selectedCoin));
    } else {
      dispatch(
        setNotification({
          msg:
            "Swap complete for coin " +
            statecoin.getTXIdAndOut() +
            " of value " +
            fromSatoshi(res.payload.value),
        })
      );
      dispatch(removeCoinFromSwapRecords(selectedCoin));
    }
    if (new_statecoin && new_statecoin?.swap_auto) {
      // dispatch(setNotification({msg:"Retrying join auto swap with new statecoin:' + new_statecoin.shared_key_id"}));
      dispatch(addCoinToSwapRecords(new_statecoin));
      dispatch(addSwapPendingCoin(new_statecoin.shared_key_id));
    }
  }
};

export const setIntervalIfOnline = (func, online, delay, isMounted) => {
  // Runs interval if app online
  // Restart online interval in useEffect loop [torInfo.online]
  // make online = torInfo.online
  let interval = setInterval(() => {
    if (isMounted === true && online === true) {
      func(isMounted);
    } else {
      clearInterval(interval);
    }
  }, delay);
  return interval;
};

// Pre checks actions for use in confirm PopUp modal

export const checkWithdrawal = (dispatch, selectedCoins, inputAddr) => {
  // Pre action confirmation checks for withdrawal - return true to prevent action

  // check statechain is chosen
  if (selectedCoins.length === 0) {
    dispatch(setError({ msg: "Please choose a StateCoin to withdraw." }));
    return true;
  }
  if (!inputAddr) {
    dispatch(setError({ msg: "Please enter an address to withdraw to." }));
    return true;
  }

  // if total coin sum is less that 0.001BTC then return error
  if (callSumStatecoinValues(selectedCoins) < 100000) {
    dispatch(setError({ msg: "Mininum withdrawal size is 0.001 BTC." }));
    return true;
  }

  try {
    bitcoin.address.toOutputScript(inputAddr, wallet.config.network);
  } catch (e) {
    dispatch(setError({ msg: "Invalid Bitcoin address entered." }));
    return true;
  }

  if (callIsBatchMixedPrivacy(selectedCoins)) {
    dispatch(
      setNotification({
        msg: "Warning: Withdrawal transaction contains both private and un-swapped inputs.",
      })
    );
  }
};

export const callCreateChannel = async (amount, peer_node) => {
  console.log("[WalletDataSlice.js]->callCreateChannel");
  // Creates channel object in wallet.channels and returns address for funding
  if (isWalletLoaded()) {
    return await wallet.createChannel(amount, peer_node);
  }
  return null;
};

export const callSendPayment = async (invoiceStr, dispatch) => {
  console.log("[WalletDataSlice.js]->callSendPayment");

  if (isWalletLoaded()) {
    try {
      await wallet.sendPayment(invoiceStr);
      dispatch(setSuccessMessage({ msg: "Payment sent successfully" }));
    } catch (e) {
      dispatch(setError({ msg: "Error sending payment." }));
    }
  }
};

export const callDeleteChannelByAddr = async (addr) => {
  if (isWalletLoaded()) {
    deleteChannelByAddr(addr).then((res) => {
      if (res.status === 200) {
        wallet.channels.deleteChannelByAddr(addr);
      }
    });
  }
};

export const checkChannelWithdrawal = async (
  dispatch,
  selectedChannels,
  inputAddr
) => {
  // Pre action confirmation checks for withdrawal - return true to prevent action
  const ping_lightning_ms_new = await pingLightning();
  dispatch(setPingLightningMs(ping_lightning_ms_new));
  if (ping_lightning_ms_new === null) {
    dispatch(
      setError({
        msg: "Lightning server not connected. Please try again later.",
      })
    );
    return true;
  }
  // check if channel is chosen
  if (selectedChannels.length === 0) {
    dispatch(setError({ msg: "Please choose a channel to close." }));
    return true;
  }

  /*
  if (!inputAddr) {
    dispatch(setError({ msg: "Please enter an address to withdraw to." }));
    return true;
  }*/

  // if total sats sum in all selected channels less than 0.001BTC (100000 sats) then return error
  /*
  if (callSumChannelAmt(selectedChannels) < 100000) {
    dispatch(
      setError({ msg: "Mininum withdrawal size is 0.001 BTC (100000 sats)." })
    );
    return true;
  }*/

  /*
  try {
    bitcoin.address.toOutputScript(inputAddr, wallet.config.network);
  } catch (e) {
    dispatch(setError({ msg: "Invalid Bitcoin address entered." }));
    return true;
  }*/
};

export const checkChannelCreation = async (dispatch, amount, nodekey) => {
  const ping_lightning_ms_new = await pingLightning();
  dispatch(setPingLightningMs(ping_lightning_ms_new));
  if (ping_lightning_ms_new === null) {
    dispatch(
      setError({
        msg: "Lightning server not connected. Please try again later.",
      })
    );
    return true;
  }
  if (amount === "") {
    dispatch(setError({ msg: "Please set the amount of the funding tx." }));
    return true;
  }
  if (nodekey === "") {
    dispatch(
      setError({ msg: "Please set the nodekey to open channel with peer " })
    );
    return true;
  }
  if (nodekey.includes(".onion")) {
    dispatch(
      setError({
        msg: "Connecting to Tor onion address is currently not supported, please enter nodekey having IPv4 or IPv6 address. ",
      })
    );
    return true;
  }
  if (!isValidNodeKeyAddress(nodekey)) {
    dispatch(setError({ msg: "Please enter a valid nodekey address " }));
    return true;
  }
};

export const checkChannelSend = async (dispatch, inputAddr) => {
  // Pre action confirmation checks for send sats - return true to prevent action
  const ping_lightning_ms_new = await pingLightning();
  dispatch(setPingLightningMs(ping_lightning_ms_new));
  if (ping_lightning_ms_new === null) {
    dispatch(
      setError({
        msg: "Lightning server not connected. Please try again later.",
      })
    );
    return true;
  }
  if (!inputAddr) {
    dispatch(
      setError({ msg: "Please enter a lightning address to send sats." })
    );
    return true;
  }
  // Check for valid lightning address
  if (!isValidLnInvoice(inputAddr)) {
    dispatch(setError({ msg: "Please enter a valid lightning address." }));
    return true;
  }
};

export const checkSend = (dispatch, selectedCoins, inputAddr) => {
  // Pre action confirmation checks for send statecoin - return true to prevent action

  // check statechain is chosen
  if (selectedCoins.length === 0) {
    dispatch(setError({ msg: "Please choose a StateCoin to send." }));
    return true;
  }
  var input_pubkey = "";

  try {
    if (
      inputAddr.substring(0, 4) === "xpub" ||
      inputAddr.substring(0, 4) === "tpub"
    ) {
      input_pubkey = callProofKeyFromXpub(inputAddr, 0);
    } else {
      input_pubkey = decodeSCEAddress(inputAddr);
    }
  } catch (e) {
    dispatch(setError({ msg: "Error: " + e.message }));
    return true;
  }

  if (
    !(input_pubkey.slice(0, 2) === "02" || input_pubkey.slice(0, 2) === "03")
  ) {
    if (
      inputAddr.substring(0, 4) === "xpub" ||
      inputAddr.substring(0, 4) === "tpub"
    ) {
      dispatch(setError({ msg: "Error: Invalid Extended Public Key" }));
      return true;
    }
    dispatch(setError({ msg: "Error: invalid proof public key." }));
    return true;
  }

  if (input_pubkey.length !== 66) {
    if (
      inputAddr.substring(0, 4) === "xpub" ||
      inputAddr.substring(0, 4) === "tpub"
    ) {
      dispatch(setError({ msg: "Error: Invalid Extended Public Key" }));
      return true;
    }

    dispatch(setError({ msg: "Error: invalid proof public key" }));
    return true;
  }
};

export const setNetworkType = async (networkType) => {
  if (isWalletLoaded()) {
    wallet.networkType = networkType;
    wallet.config = new Config(
      wallet.config.network,
      networkType,
      testing_mode
    );
    await wallet.setHttpClient(networkType);
    await wallet.setElectrsClient(networkType);
    await wallet.set_adapter_endpoints();
    await wallet.save();
  }
};

export const getNetworkType = () => {
  if (isWalletLoaded()) {
    return wallet.networkType;
  }
};
export const UpdateSpeedInfo = async (
  dispatch,
  torOnline = true,
  ping_server_ms,
  ping_electrum_ms,
  ping_conductor_ms,
  setServerConnected,
  setConductorConnected,
  setElectrumConnected,
  block_height
) => {
  let server_ping_ms_new;
  let conductor_ping_ms_new;
  let electrum_ping_ms_new;
  if (!torOnline) {
    wallet.electrum_client.disableBlockHeightSubscribe();
    server_ping_ms_new = null;
    conductor_ping_ms_new = null;
    electrum_ping_ms_new = null;
  } else {
    wallet.electrum_client.enableBlockHeightSubscribe();
    try {
      server_ping_ms_new = await pingServer(wallet.http_client);
      if (server_ping_ms_new !== ping_server_ms) {
        dispatch(setPingServerMs(server_ping_ms_new));
        setServerConnected(server_ping_ms_new != null);
        callGetFeeInfo()
          .then((fee_info) => {
            dispatch(updateFeeInfo(fee_info));
          })
          .catch((err) => {
            handleErrors(err);
          });
      }
    } catch (err) {
      server_ping_ms_new = null;
    }
    try {
      conductor_ping_ms_new = await pingConductor(wallet.http_client);
      if (conductor_ping_ms_new !== ping_conductor_ms) {
        dispatch(setPingConductorMs(conductor_ping_ms_new));
        setConductorConnected(conductor_ping_ms_new != null);
      }
    } catch (err) {
      conductor_ping_ms_new = null;
    }
    try {
      electrum_ping_ms_new = await pingElectrum(wallet.electrum_client);
      if (electrum_ping_ms_new !== ping_electrum_ms) {
        dispatch(setPingElectrumMs(electrum_ping_ms_new));
        if (block_height && block_height !== 0) {
          setElectrumConnected(electrum_ping_ms_new != null);
        }
      }
    } catch (err) {
      electrum_ping_ms_new = null;
    }
  }
};

export const callResetConnectionData = (dispatch) => {
  resetSwapGroupInfo();
  resetBlockHeight();
  dispatch(setPingConductorMs(null));
  dispatch(setPingElectrumMs(null));
  dispatch(setPingServerMs(null));
  dispatch(setBlockHeightLoad(false));
  dispatch(updateFeeInfo({ deposit: "NA", withdraw: "NA" }));
};

// Redux 'thunks' allow async access to Wallet. Errors thrown are recorded in
// state.error_dialogue, which can then be displayed in GUI or handled elsewhere.

export const callTokenInit = createAsyncThunk(
  "tokenInit",
  async (action, thunkAPI) => {
    return wallet.tokenInit(action.amount);
  }
);

export const callTokenVerifyValues = async (token_id) => {
  return await wallet.tokenVerify(token_id);
};

export const callTokenVerify = createAsyncThunk(
  "tokenVerify",
  async (action, thunkAPI) => {
    console.log("calling wallet.tokenVerify()...");

    return wallet.tokenVerify(action.token_id);
  }
);

export const callDepositInit = createAsyncThunk(
  "depositInit",
  async (value, thunkAPI) => {
    return wallet.depositInit(value);
  }
);

export const callTokenDepositInit = createAsyncThunk(
  "tokenDepositInit",
  async (action, thunkAPI) => {
    return wallet.tokenDepositInit(action.value, action.token);
  }
);

export const callDeleteTokenByAddress = createAsyncThunk(
  "tokenDeleteByAddress",
  async (action, thunkAPI) => {
    if (isWalletLoaded()) {
      console.log(
        "trying to delete token id by address" +
          action.lnAddress +
          " from wallet."
      );
      log.info(
        "Removing token by address" + action.lnAddress + " from wallet."
      );
      wallet.deleteTokenByAddress(action.lnAddress);
    }
  }
);

export const callTokenDeleteAsync = createAsyncThunk(
  "tokenDeleteAsync",
  async (action, thunkAPI) => {
    if (isWalletLoaded()) {
      console.log(
        "trying to delete token id" + action.tokenId + " from wallet."
      );
      log.info("Removing token " + action.tokenId + " from wallet.");
      wallet.deleteToken(action.tokenId);
    }
  }
);

export const callDepositConfirm = createAsyncThunk(
  "depositConfirm",
  async (action, thunkAPI) => {
    return wallet.depositConfirm(action.shared_key_id);
  }
);
export const callWithdraw = createAsyncThunk(
  "depositWithdraw",
  async (action, thunkAPI) => {
    return wallet.withdraw_init(
      action.shared_key_ids,
      action.rec_addr,
      action.fee_per_byte
    );
  }
);
export const callTransferSender = createAsyncThunk(
  "TransferSender",
  async (action, thunkAPI) => {
    return wallet.transfer_sender(action.shared_key_ids, action.rec_addr);
  }
);
export const callTransferReceiver = createAsyncThunk(
  "TransferReceiver",
  async (action, thunkAPI) => {
    const excluded_txids = thunkAPI.getState().walletData.excluded_txids;
    return wallet.transfer_receiver(
      decodeMessage(action, wallet.config.network),
      excluded_txids
    );
  }
);
export const callGetTransfers = createAsyncThunk(
  "GetTransfers",
  async (action, thunkAPI) => {
    return wallet.get_transfers(action.addr_index, action.numReceive);
  }
);

export const callDoAutoSwap = createAsyncThunk(
  "DoSwap",
  async (action, thunkAPI) => {
    return wallet.setStateCoinAutoSwap(action);
  }
);

export const callDoSwap = createAsyncThunk(
  "DoSwap",
  async (action, thunkAPI) => {
    const excluded_txids = thunkAPI.getState().walletData.excluded_txids;
    return wallet.do_swap(action.shared_key_id, excluded_txids);
  }
);
export const callResumeSwap = createAsyncThunk(
  "ResumeSwap",
  async (action, thunkAPI) => {
    return wallet.resume_swap(action.shared_key_id);
  }
);
export const callUpdateSwapGroupInfo = createAsyncThunk(
  "UpdateSwapGroupInfo",
  async (action, thunkAPI) => {
    await wallet.updateSwapGroupInfo();
  }
);
export const callClearSwapGroupInfo = createAsyncThunk(
  "ClearSwapGroupInfo",
  async (action, thunkAPI) => {
    wallet.clearSwapGroupInfo();
  }
);

export const callGetNewTorId = createAsyncThunk(
  "UpdateTorId",
  async (action, thunkAPI) => {
    wallet.updateTorId();
  }
);

export const callGetNewTorCircuit = createAsyncThunk(
  "GetNewTorCircuit",
  async (action, thunkAPI) => {
    wallet.getTorCircuit();
  }
);

export const callUpdateTorCircuitInfo = createAsyncThunk(
  "UpdateTorCircuitInfo",
  async (action, thunkAPI) => {
    try {
      wallet.updateTorcircuitInfo();
    } catch (err) {
      console.log("handling tor circuit error...");
      handleNetworkError(err);
    }
  }
);

export const callUpdateSwapStatus = createAsyncThunk(
  "UpdateSwapStatus",
  async (action, thunkAPI) => {
    wallet.updateSwapStatus();
  }
);
export const callSwapDeregisterUtxo = createAsyncThunk(
  "SwapDeregisterUtxo",
  async (action, thunkAPI) => {
    let statecoin = wallet.statecoins.getCoin(action.shared_key_id);
    if (!statecoin)
      throw Error(
        `callSwapDeregisterUtxo: statecoin with shared key id ${action.shared_key_id} not found`
      );
    try {
      await wallet.deRegisterSwapCoin(statecoin);
    } catch (e) {
      if (e?.message.includes("Coin is not in a swap pool")) {
        if (action?.autoswap === true) {
          action.dispatch(
            setNotification({
              msg: `Deactivated auto-swap for coin: ${statecoin.getTXIdAndOut()}.`,
            })
          );
        } else {
          action.dispatch(
            setNotification({
              msg: `Statecoin: ${statecoin.getTXIdAndOut()}: ${
                e?.message ? e?.message : e
              }`,
            })
          );
        }
      } else {
        throw e;
      }
    }
  }
);

export const callGetFeeEstimation = createAsyncThunk(
  "GetFeeEstimation",
  async (action, thunkAPI) => {
    return await wallet.electrum_client.getFeeEstimation(action);
  }
);

export const callSetStatecoinSpent = createAsyncThunk(
  "SetStatecoinSpent",
  async (action, thunkAPI) => {
    return await wallet.setStateCoinSpent(action.id, action.action);
  }
);

const WalletSlice = createSlice({
  name: "walletData",
  initialState,
  reducers: {
    setNetwork: (state, action) => {
      return {
        ...state,
        network: action.payload,
      };
    },
    setTorOnline(state, action) {
      return {
        ...state,
        torInfo: { online: action.payload },
      };
    },
    addCoins(state, action) {
      return {
        ...state,
        coinsAdded: state.coinsAdded + action.payload,
      };
    },
    removeCoins(state, action) {
      return {
        ...state,
        coinsRemoved: state.coinsRemoved + action.payload,
      };
    },
    addCoinToSwapRecords(state, action) {
      if (state.swapRecords.indexOf(action.payload) === -1) {
        return {
          ...state,
          swapRecords: [...state.swapRecords, action.payload],
        };
      }
    },
    removeCoinFromSwapRecords(state, action) {
      return {
        ...state,
        swapRecords: state.swapRecords.filter(
          (item) => item !== action.payload
        ),
      };
    },
    removeAllCoinsFromSwapRecords(state, action) {
      return {
        ...state,
        swapRecords: [],
      };
    },
    // Update total_balance
    updateBalanceInfo(state, action) {
      let payload = action.payload;
      let new_balance_info = { ...state.balance_info, ...payload };
      if (!isEqual(new_balance_info, state.balance_info)) {
        return {
          ...state,
          balance_info: new_balance_info,
        };
      }
    },
    // Update fee_info
    updateFeeInfo(state, action) {
      return {
        ...state,
        fee_info: action.payload,
      };
    },
    //update Token
    setToken(state, action) {
      return {
        ...state,
        token: action.payload,
      };
    },
    resetToken(state, action) {
      return {
        ...state,
        token: { token: { id: "", btc: "", ln: "" }, values: [] },
      };
    },
    setTokenVerifyIdle(state, action) {
      return {
        ...state,
        token_verify: { ...state.token_verify, status: "idle" },
      };
    },
    // Update ping_swap
    updatePingSwap(state, action) {
      return {
        ...state,
        ping_swap: action.payload,
      };
    },
    // Update ping_swap
    updatePingServer(state, action) {
      return {
        ...state,
        ping_server: action.payload,
      };
    },
    updateFilter(state, action) {
      return {
        ...state,
        filterBy: action.payload,
      };
    },
    updateWalletMode(state, action) {
      return {
        ...state,
        walletMode: action.payload,
      };
    },
    updateChannelEvents(state, action) {
      return {
        ...state,
        channelEvents: action.payload,
      };
    },
    updateSwapPendingCoins(state, action) {
      return {
        ...state,
        swapPendingCoins: action.payload,
      };
    },
    addSwapPendingCoin(state, action) {
      let prev = state.swapPendingCoins;
      if (!prev.includes(action.payload)) {
        return {
          ...state,
          swapPendingCoins: state.swapPendingCoins.concat(action.payload),
        };
      }
    },
    removeSwapPendingCoin(state, action) {
      let prev = state.swapPendingCoins;
      if (prev.includes(action.payload)) {
        function isNot(value) {
          return value !== action.payload;
        }
        state.swapPendingCoins = state.swapPendingCoins.filter(isNot);
      }
    },
    clearSwapPendingCoins(state, _action) {
      state.swapPendingCoins = [];
    },
    updateInSwapValues(state, action) {
      return {
        ...state,
        inSwapValues: action.payload,
      };
    },
    addInSwapValue(state, action) {
      let prev = state.inSwapValues;
      if (!prev.includes(action.payload)) {
        return {
          ...state,
          inSwapValues: state.inSwapValues.concat(action.payload),
        };
      }
    },
    removeInSwapValue(state, action) {
      let prev = state.inSwapValues;
      if (prev.includes(action.payload)) {
        function isNot(value) {
          return value !== action.payload;
        }
        state.inSwapValues = state.inSwapValues.filter(isNot);
      }
    },
    clearInSwapValues(state, _action) {
      state.inSwapValues = [];
    },
    setSwapLoad(state, action) {
      var update = action.payload;
      return {
        ...state,
        swapLoad: {
          join: update.join,
          swapCoin: update.swapCoin,
          leave: update.leave,
        },
      };
    },
    setBlockHeightLoad(state, action) {
      // Toggle to refresh block height components
      var update = action.payload;
      return {
        ...state,
        blockHeightLoad: update,
      };
    },
    // Deposit
    dummyDeposit() {
      let proof_key =
        "02c69dad87250b032fe4052240eaf5b8a5dc160b1a144ecbcd55e39cf4b9b49bfd";
      let funding_txid =
        "64ec6bc7f794343a0c3651c0578f25df5134322b959ece99795dccfffe8a87e9";
      let funding_vout = 0;
      wallet.addStatecoinFromValues(
        uuidv4(),
        dummy_master_key,
        10000,
        funding_txid,
        funding_vout,
        proof_key,
        ACTION.DEPOSIT
      );
    },
    setErrorSeen(state) {
      state.error_dialogue.seen = true;
    },
    setError(state, action) {
      if (!testing_mode) log.error(action.payload.msg);
      return {
        ...state,
        error_dialogue: { seen: false, msg: action.payload.msg },
      };
    },
    setProgressComplete(state) {
      return {
        ...state,
        progress: { active: false, msg: "" },
      };
    },
    setProgress(state, action) {
      return {
        ...state,
        progress: { active: true, msg: action.payload.msg },
      };
    },
    setNotificationSeen(state, action) {
      return {
        ...state,
        notification_dialogue: state.notification_dialogue.filter((item) => {
          return item.msg !== action.payload.msg;
        }),
      };
    },
    setNotification(state, action) {
      log.info(action.payload.msg);
      return {
        ...state,
        notification_dialogue: [
          ...state.notification_dialogue,
          { msg: action.payload.msg },
        ],
      };
    },
    setOneOffMsg(state, action) {
      return {
        ...state,
        one_off_msg: {
          ...state.one_off_msg,
          key: action.payload.key,
          msg: action.payload.msg,
        },
      };
    },
    setOneOffMsgSeen(state) {
      state.one_off_msg.seen = true;
    },
    setWarning(state, action) {
      let onHide, onConfirm, data;

      if (action.payload.onHide) {
        onHide = action.payload.onHide;
      }
      if (action.payload.onConfirm) {
        onConfirm = action.payload.onConfirm;
      }
      if (action.payload.data) {
        data = action.payload.data;
      }

      return {
        ...state,
        warning_dialogue: {
          ...state.warning_dialogue,
          title: action.payload.title,
          msg: action.payload.msg,
          onHide: onHide,
          onConfirm: onConfirm,
          data: data,
        },
      };
    },
    setWarningSeen(state, action) {
      return {
        ...state,
        warning_dialogue: {
          title: "",
          msg: "",
          onHide: undefined,
          onConfirm: undefined,
        },
      };
    },
    setShowDetails(state, action) {
      return {
        ...state,
        showDetails: action.payload,
      };
    },
    setShowDetailsSeen(state, action) {
      return {
        ...state,
        showDetails: DEFAULT_STATE_COIN_DETAILS,
      };
    },
    setWallet(state, action) {
      return {
        ...state,
        currentWallet: action.payload.wallet,
      };
    },
    setWalletLoaded(state, action) {
      return {
        ...state,
        walletLoaded: action.payload.loaded,
      };
    },
    setLightningLoaded(state, action) {
      return {
        ...state,
        lightningLoaded: action.payload.loaded,
      };
    },
    callClearSave(state) {
      wallet.clearSave();
      return {
        ...state,
      };
    },
    setPingServerMs(state, action) {
      return {
        ...state,
        ping_server_ms: action.payload,
      };
    },
    setPingConductorMs(state, action) {
      return {
        ...state,
        ping_conductor_ms: action.payload,
      };
    },
    setPingElectrumMs(state, action) {
      return {
        ...state,
        ping_electrum_ms: action.payload,
      };
    },
    setPingLightningMs(state, action) {
      return {
        ...state,
        ping_lightning_ms: action.payload,
      };
    },
    setShowWithdrawPopup(state, action) {
      return {
        ...state,
        showWithdrawPopup: action.payload,
      };
    },
    setWithdrawTxid(state, action) {
      return {
        ...state,
        withdraw_txid: action.payload,
      };
    },
    setShowInvoicePopup(state, action) {
      return {
        ...state,
        showInvoicePopup: action.payload,
      };
    },
    setSuccessMessage(state, action) {
      return {
        ...state,
        success_dialogue: {
          ...state.success_dialogue,
          msg: action.payload.msg,
        },
      };
    },
    setSuccessMessageSeen(state, action) {
      return {
        ...state,
        success_dialogue: {
          msg: "",
        },
      };
    },
    setExcludedTxids(state, action) {
      return {
        ...state,
        excluded_txids: action.payload,
      };
    },
  },
  extraReducers: {
    // Pass rejects through to error_dialogue for display to user.
    [walletLoad.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callTokenInit.pending]: (state) => {
      state.token_init_status = "pending";
    },
    [callTokenInit.fulfilled]: (state, action) => {
      let res = action.payload;

      state.token_init_status = "fulfilled";

      callAddToken({ token: res, values: action.meta.arg.values });
    },
    [callTokenInit.rejected]: (state, action) => {
      state.token_init_status = "rejected";
    },
    [callTokenVerify.pending]: (state) => {
      state.token_verify.status = "pending";
    },
    [callTokenVerify.fulfilled]: (state, action) => {
      let res = action.payload;

      state.token_verify.status = "fulfilled";
      state.token_verify.spent = res.spent;
      state.token_verify.confirmed = res.confirmed;
    },
    [callTokenVerify.rejected]: (state, action) => {
      state.token_verify.status = "rejected";
    },
    [callTokenDepositInit.pending]: (state) => {
      state.depositLoading = true;
    },
    [callTokenDepositInit.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callTokenDepositInit.fulfilled]: (state) => {
      state.depositLoading = false;
    },
    [callDepositInit.pending]: (state) => {
      state.depositLoading = true;
    },
    [callDepositInit.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callDepositInit.fulfilled]: (state) => {
      state.depositLoading = false;
    },
    [callDepositConfirm.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callGetUnspentStatecoins.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callWithdraw.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callTransferSender.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callTransferReceiver.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callGetTransfers.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callDoSwap.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callResumeSwap.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callUpdateSwapGroupInfo.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callClearSwapGroupInfo.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callUpdateSwapStatus.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callSwapDeregisterUtxo.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callGetFeeEstimation.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
    [callCreateBackupTxCPFP.rejected]: (state, action) => {
      state.error_dialogue = {
        seen: false,
        msg: action.error.name + ": " + action.error.message,
      };
    },
  },
});

export const {
  callGenSeAddr,
  refreshCoinData,
  setErrorSeen,
  setError,
  setProgressComplete,
  setProgress,
  setOneOffMsg,
  setOneOffMsgSeen,
  setWarning,
  setWarningSeen,
  setShowDetails,
  setShowDetailsSeen,
  setWalletLoaded,
  setLightningLoaded,
  setWallet,
  addCoinToSwapRecords,
  removeCoinFromSwapRecords,
  removeAllCoinsFromSwapRecords,
  updateFeeInfo,
  updatePingServer,
  updatePingSwap,
  setNotification,
  setNotificationSeen,
  updateBalanceInfo,
  callClearSave,
  setToken,
  resetToken,
  setTokenVerifyIdle,
  updateFilter,
  updateWalletMode,
  updateChannelEvents,
  updateSwapPendingCoins,
  addSwapPendingCoin,
  removeSwapPendingCoin,
  clearSwapPendingCoins,
  clearInSwapValues,
  updateInSwapValues,
  addInSwapValue,
  removeInSwapValue,
  setSwapLoad,
  setBlockHeightLoad,
  updateTxFeeEstimate,
  addCoins,
  removeCoins,
  setNetwork,
  setTorOnline,
  setPingServerMs,
  setPingConductorMs,
  setPingElectrumMs,
  setPingLightningMs,
  setShowWithdrawPopup,
  setWithdrawTxid,
  setShowInvoicePopup,
  setSuccessMessage,
  setSuccessMessageSeen,
  setExcludedTxids,
} = WalletSlice.actions;
export default WalletSlice.reducer;

const dummy_master_key = {
  public: {
    q: {
      x: "47dc67d37acf9952b2a39f84639fc698d98c3c6c9fb90fdc8b100087df75bf32",
      y: "374935604c8496b2eb5ff3b4f1b6833de019f9653be293f5b6e70f6758fe1eb6",
    },
    p2: {
      x: "5220bc6ebcc83d0a1e4482ab1f2194cb69648100e8be78acde47ca56b996bd9e",
      y: "8dfbb36ef76f2197598738329ffab7d3b3a06d80467db8e739c6b165abc20231",
    },
    p1: {
      x: "bada7f0efb10f35b920ff92f9c609f5715f2703e2c67bd0e362227290c8f1be9",
      y: "46ce24197d468c50001e6c2aa6de8d9374bb37322d1daf0120215fb0c97a455a",
    },
    paillier_pub: {
      n: "17945609950524790912898455372365672530127324710681445199839926830591356778719067270420287946423159715031144719332460119432440626547108597346324742121422771391048313578132842769475549255962811836466188142112842892181394110210275612137463998279698990558525870802338582395718737206590148296218224470557801430185913136432965780247483964177331993320926193963209106016417593344434547509486359823213494287461975253216400052041379785732818522252026238822226613139610817120254150810552690978166222643873509971549146120614258860562230109277986562141851289117781348025934400257491855067454202293309100635821977638589797710978933",
    },
    c_key:
      "36d7dde4b796a7034fc6cfd75d341b223012720b52a35a37cd8229839fe9ed1f1f1fe7cbcdbc0fa59adbb757bd60a5b7e3067bc49c1395a24f70228cc327d7346b639d4e81bd3cfd39698c58e900f99c3110d6a3d769f75c8f59e7f5ad57009eadb8c6e6c4830c1082ddd84e28a70a83645354056c90ab709325fc6246d505134d4006ef6fec80645493483413d309cb84d5b5f34e28ab6af3316e517e556df963134c09810f754c58b85cf079e0131498f004108733a5f6e6a242c549284cf2df4aede022d03b854c6601210b450bdb1f73591b3f880852f0e9a3a943e1d1fdb8d5c5b839d0906de255316569b703aca913114067736dae93ea721ddd0b26e33cf5b0af67cee46d6a3281d17082a08ab53688734667c641d71e8f69b25ca1e6e0ebf59aa46c0e0a3266d6d1fba8e9f25837a28a40ae553c59fe39072723daa2e8078e889fd342ef656295d8615531159b393367b760590a1325a547dc1eff118bc3655912ac0b3c589e9d7fbc6d244d5860dfb8a5a136bf7b665711bf4e75fe42eb28a168d1ddd5ecf77165a3d4db72fda355c0dc748b0c6c2eada407dba5c1a6c797385e23c050622418be8f3cd393e6acd8a7ea5bd3306aafae75f4def94386f62564fce7a66dc5d99c197d161c7c0d3eea898ca3c5e9fbd7ceb1e3f7f2cb375181cf98f7608d08ed96ef1f98af3d5e2d769ae4211e7d20415677eddd1051",
  },
  private: {
    x2: "34c0b428488ddc6b28e05cee37e7c4533007f0861e06a2b77e71d3f133ddb81b",
  },
  chain_code: "0",
};
