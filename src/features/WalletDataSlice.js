import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";

import { Wallet, ACTION, STATECOIN_STATUS } from "../wallet";
import { getFeeInfo, getCoinsInfo } from "../wallet/mercury/info_api";
import { pingServer as pingConductor } from "../wallet/swap/info_api";
import { pingServer } from "../wallet/mercury/info_api";
import { decodeMessage } from "../wallet/util";
import { resetIndex } from "../containers/Receive/Receive";

import { v4 as uuidv4 } from "uuid";
import * as bitcoin from "bitcoinjs-lib";
import { mutex } from "../wallet/electrum";
import { SWAP_STATUS, UI_SWAP_STATUS } from "../wallet/swap/swap_utils";

const isEqual = require("lodash").isEqual;

// eslint-disable-next-line
const CLOSED = require("websocket").w3cwebsocket.CLOSED;
// eslint-disable-next-line
const OPEN = require("websocket").w3cwebsocket.OPEN;

let log;
try {
  log = window.require("electron-log");
} catch (e) {
  log = require("electron-log");
}

export const callGetArgsHasTestnet = () => {
  // set to testnet mode for testing
  if (require("../settings.json").testing_mode) {
    return true;
  }
  let found = false;
  try {
    window.require("@electron/remote").process.argv.forEach((arg) => {
      if (arg.includes("testnet")) {
        found = true;
      }
    });
  } catch (e) {
    // set testnet for testing
    found = true;
  }
  return found;
};

let network;
if (callGetArgsHasTestnet()) {
  network = bitcoin.networks["testnet"];
} else {
  network = bitcoin.networks["bitcoin"];
}

let wallet;
let testing_mode = require("../settings.json").testing_mode;

const initialState = {
  notification_dialogue: [],
  error_dialogue: { seen: true, msg: "" },
  warning_dialogue: { key: "", msg: "", seen: false },
  progress: { active: false, msg: "" },
  balance_info: { total_balance: null, num_coins: null, hidden: false },
  fee_info: { deposit: "NA", withdraw: "NA" },
  ping_swap: null,
  ping_server: null,
  filterBy: "default",
  depositLoading: false,
  swapRecords: [],
  swapPendingCoins: [],
  inSwapValues: [],
  swapLoad: { join: false, swapCoin: "", leave: false },
  coinsAdded: 0,
  coinsRemoved: 0,
  torInfo: { online: false },
};

// Check if a wallet is loaded in memory
export const isWalletLoaded = () => {
  return wallet !== undefined && wallet.isActive();
};

export const isWalletActive = () => {
  return isWalletLoaded() && wallet.isActive();
};

export const unloadWallet = () => {
  if (isWalletLoaded()) {
    resetIndex();
    wallet = undefined;
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
  walletLoad(name, password);
};

export const getWalletName = () => {
  if (wallet) {
    return wallet.name;
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
    //log.info(`Restarting electrum server`);
    if (wallet.electrum_client) {
      wallet.electrum_client.unsubscribeAll();
      wallet.electrum_client = null;
    }
    mutex.runExclusive(async () => {
      wallet.electrum_client = wallet.newElectrumClient();
      try {
        wallet.initElectrumClient(setBlockHeightCallBack);
      } catch (err) {
        //log.info(`Failed to initialize electrum client: ${err}`);
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
    //log.info(`Failed to restart electum server: ${err}`);
  }
}

// Call back fn updates wallet block_height upon electrum block height subscribe message event.
// This fn must be in scope of the wallet being acted upon
function setBlockHeightCallBack(item) {
  if (wallet) {
    wallet.setBlockHeight(item);
  }
}

// Load wallet from store
export const walletLoad = (name, password) => {
  wallet = Wallet.load(name, password, testing_mode);
  wallet.resetSwapStates();
  wallet.disableAutoSwaps();

  wallet.deRegisterSwaps().then(() => {
    //log.info("Wallet " + name + " loaded from memory. ");

    if (testing_mode) log.info("Testing mode set.");
    mutex.runExclusive(async () => {
      await wallet.set_tor_endpoints();
      wallet.initElectrumClient(setBlockHeightCallBack);
      wallet.updateSwapStatus();
      await wallet.updateSwapGroupInfo();
      wallet.updateSpeedInfo();
    });
  });
};

// Create wallet from nmemonic and load wallet. Try restore wallet if set.
export async function walletFromMnemonic(
  dispatch,
  name,
  password,
  mnemonic,
  router,
  try_restore,
  gap_limit = undefined
) {
  wallet = Wallet.fromMnemonic(name, password, mnemonic, network, testing_mode);
  wallet.resetSwapStates();
  //log.info("Wallet " + name + " created.");
  if (testing_mode)
    //log.info("Testing mode set.");
    mutex.runExclusive(async () => {
      await wallet.set_tor_endpoints();
      wallet.initElectrumClient(setBlockHeightCallBack);
      if (try_restore) {
        try {
          const n_recovered = await wallet.recoverCoinsFromServer(
            gap_limit,
            dispatch
          );
          dispatch(addCoins(n_recovered));
        } catch {
          dispatch(setProgressComplete({ msg: "" }));
          dispatch(
            setError({
              msg: "Error in Recovery - check online connection and retry",
            })
          );
          return;
        }
      }
      await callNewSeAddr();
      await wallet.save();
      await wallet.saveName();
      dispatch(setProgressComplete({ msg: "" }));
      router.push("/home");
    });
}
// Try to decrypt wallet. Throw if invalid password
export const checkWalletPassword = (password) => {
  Wallet.load(wallet.name, password);
};

// Create wallet from backup file
export const walletFromJson = (wallet_json, password) => {
  wallet = Wallet.loadFromBackup(wallet_json, password, testing_mode);
  wallet.resetSwapStates();

  //log.info("Wallet " + wallet.name + " loaded from backup.");
  if (testing_mode)
    //log.info("Testing mode set.");
    return Promise.resolve().then(() => {
      return mutex
        .runExclusive(async () => {
          await wallet.set_tor_endpoints();
          wallet.initElectrumClient(setBlockHeightCallBack);
          await callNewSeAddr();
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
export const callGetPingServerms = () => {
  if (isWalletLoaded()) {
    return wallet.getPingServerms();
  }
};
export const callGetPingConductorms = () => {
  if (isWalletLoaded()) {
    return wallet.getPingConductorms();
  }
};
export const callGetPingElectrumms = () => {
  if (isWalletLoaded()) {
    return wallet.getPingElectrumms();
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

export const callGetActivityLogItems = (num_of_items) => {
  if (isWalletLoaded()) {
    return wallet.getActivityLogItems(num_of_items);
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
// Remove coin from coins list
export const callRemoveCoin = async (shared_key_id) => {
  if (isWalletLoaded()) {
    //log.info("Removing coin " + shared_key_id + " from wallet.");
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
    return wallet.storage.getWallet(wallet.name);
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
  if (statecoin === undefined || statecoin === null) {
    statecoin = selectedCoin;
  } else {
    dispatch(removeInSwapValue(statecoin.value));
  }
  if (res.payload === null) {
    dispatch(
      setNotification({
        msg: "Coin " + statecoin.getTXIdAndOut() + " removed from swap pool.",
      })
    );
    dispatch(removeCoinFromSwapRecords(selectedCoin)); // added this
    dispatch(setSwapLoad({ ...swapLoad, join: false, swapCoin: "" }));
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
            "Warning - received coin in swap that was previously deposited in this wallet: " +
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
            "Swap complete - Warning - received coin in swap that was previously deposited in this wallet: " +
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
  // Runs interval if app online, clears interval if offline
  // Restart online interval in useEffect loop [torInfo.online]
  // make online = torInfo.online

  const interval = setInterval(async () => {
    // console.log('interval called', online)
    if (online === false) {
      clearInterval(interval);
    }
    if (isMounted) {
      func(isMounted);
    }
  }, delay);
  return interval;
};

// Redux 'thunks' allow async access to Wallet. Errors thrown are recorded in
// state.error_dialogue, which can then be displayed in GUI or handled elsewhere.

export const callDepositInit = createAsyncThunk(
  "depositInit",
  async (value, thunkAPI) => {
    return wallet.depositInit(value);
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
    return wallet.transfer_receiver(decodeMessage(action, network));
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
    return wallet.do_swap(action.shared_key_id);
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

export const callGetNewTorId = createAsyncThunk(
  "UpdateTorId",
  async (action, thunkAPI) => {
    wallet.updateTorId();
  }
);

export const callUpdateTorCircuit = createAsyncThunk(
  "UpdateTorCircuit",
  async (action, thunkAPI) => {
    wallet.updateTorcircuitInfo();
  }
);

export const callUpdateSpeedInfo = createAsyncThunk(
  "UpdateSpeedInfo",
  async (action, thunkAPI) => {
    wallet.updateSpeedInfo(action.torOnline);
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
      log.error(action.payload.msg);
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
      //log.info(action.payload.msg);
      return {
        ...state,
        notification_dialogue: [
          ...state.notification_dialogue,
          { msg: action.payload.msg },
        ],
      };
    },
    setWarning(state, action) {
      return {
        ...state,
        warning_dialogue: {
          ...state.warning_dialogue,
          key: action.payload.key,
          msg: action.payload.msg,
        },
      };
    },
    setWarningSeen(state) {
      state.warning_dialogue.seen = true;
    },
    callClearSave(state) {
      wallet.clearSave();
      return {
        ...state,
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
    [callUpdateSpeedInfo.rejected]: (state, action) => {
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
  setWarning,
  setWarningSeen,
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
  updateFilter,
  updateSwapPendingCoins,
  addSwapPendingCoin,
  removeSwapPendingCoin,
  clearSwapPendingCoins,
  clearInSwapValues,
  updateInSwapValues,
  addInSwapValue,
  removeInSwapValue,
  setSwapLoad,
  updateTxFeeEstimate,
  addCoins,
  removeCoins,
  setTorOnline,
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
