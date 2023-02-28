"use strict";
import React, { useState, useEffect } from "react";
import { withRouter } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Tabs, Tab } from "react-bootstrap";
import {
  setError,
  walletFromMnemonic,
  walletFromJson,
  setWalletLoaded,
  initActivityLogItems,
} from "../../features/WalletDataSlice";
import { CreateWizardForm } from "../../components";
import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg";
import { Storage } from "../../store";
import { DEFAULT_NETWORK_TYPE, parseBackupData } from "../../wallet/wallet";

import "./RestoreWallet.css";
import isElectron from "is-electron";

let bip39 = require("bip39");

function isInDesiredForm(str) {
  var n = Math.floor(Number(str));
  return n !== Infinity && String(n) === str && n >= 0;
}

const RestoreWalletPage = (props) => {
  const dispatch = useDispatch();
  const [showPass, setShowPass] = useState(false);
  const toggleShowPass = () => setShowPass(!showPass);

  const [state, setState] = useState({
    wallet_name: "",
    wallet_password: "",
    mnemonic: "",
    wallet_network: DEFAULT_NETWORK_TYPE,
    gap_limit: "",
  });
  const setStateWalletName = (event) =>
    setState({ ...state, wallet_name: event.target.value });
  const setStateWalletPassword = (event) =>
    setState({ ...state, wallet_password: event.target.value });
  const setStateWalletNetwork = (networkType) =>
    setState({...state, wallet_network: networkType});
  const setStateMnemonic = (event) =>
    setState({ ...state, mnemonic: event.target.value });
  const setStateGapLimit = (event) =>
    setState({ ...state, gap_limit: event.target.value });

  // Confirm mnemonic is valid
  const onClickConf = async () => {
    let store = new Storage("wallets/wallet_names");
    let wallet_names = store.getWalletNames();

    if (wallet_names.indexOf(state.wallet_name) !== -1) {
      dispatch(
        setError({
          msg: "Wallet with name " + state.wallet_name + " already exists.",
        })
      );
      return;
    }

    if (
      wallet_names.filter((wallet) => wallet.name === state.wallet_name)
        .length > 0
    ) {
      dispatch(
        setError({
          msg: "Wallet with name " + state.wallet_name + " already exists.",
        })
      );
      return;
    }

    if (!bip39.validateMnemonic(state.mnemonic)) {
      dispatch(setError({ msg: "Invalid mnemonic" }));
      return;
    }

    let gap_range = state.gap_limit.split("-");
    let gap_start = 0;
    let gap_limit = 0;

    if (gap_range.length === 1) {
      if (!isInDesiredForm(gap_range[0])) {
        dispatch(
          setError({ msg: "Address limit must be a positive integer or range" })
        );
        return;
      }
      gap_limit = Number(gap_range[0]);
    } else if (gap_range.length === 2) {
      if (!isInDesiredForm(gap_range[0])) {
        dispatch(
          setError({ msg: "Address range start must be a positive integer" })
        );
        return;
      }
      if (!isInDesiredForm(gap_range[1])) {
        dispatch(
          setError({ msg: "Address range end must be a positive integer" })
        );
        return;
      }
      gap_start = Number(gap_range[0]);
      gap_limit = Number(gap_range[1]);

      if (gap_start >= gap_limit) {
        dispatch(setError({ msg: "Address range must be greater than zero" }));
        return;
      }
    } else {
      dispatch(
        setError({
          msg: "Address limit must be a single positive integer or range separated by a dash",
        })
      );
      return;
    }

    // Create wallet and load into Redux state

    await walletFromMnemonic(
      dispatch,
      state.wallet_name,
      state.wallet_password,
      state.mnemonic,
      state.wallet_network,
      props.history,
      true,
      gap_limit,
      gap_start
    );
  };

  const handleSelectBackupFile = () => {
    window.postMessage({
      type: "select-backup-file",
    });
  };

  useEffect(() => {
    const handleImportWalletData = async (event, backupData) => {
      try {
        const walletJson = parseBackupData(backupData);

        walletJson.name = walletJson.name + "_backup";

        let store = new Storage("wallets/wallet_names");
        let wallet_names = store.getWalletNames();
        //Check for if wallet name already exists, check in above directory
        if (
          wallet_names.filter((wallet) => wallet.name === walletJson.name)
            .length > 0
        ) {
          // Check for file with this wallet name
          dispatch(
            setError({
              msg: "Wallet with name " + walletJson.name + " already exists.",
            })
          );
          return;
        }

        const wallet = await walletFromJson(walletJson, state.wallet_password);
        if (!wallet) {
          throw new Error("error loading wallet");
        } else {
          wallet.storage.loadStatecoins(wallet);
          initActivityLogItems();
          props.history.push("/home");
          dispatch(setWalletLoaded({ loaded: true }));
        }
      } catch (error) {
        console.error(error);
        dispatch(
          setError({ msg: `Error restoring wallet from file. ${error}` })
        );
      }
    };

    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on(
        "received-backup-data",
        handleImportWalletData
      );
      return () =>
        window.electron.ipcRenderer.removeListener(
          "received-backup-data",
          handleImportWalletData
        );
    }
  }, [state, dispatch, props]);

  return (
    <div className="restore-wallet-wrap">
      <Tabs defaultActiveKey={"Restore from Seed"}>
        <Tab eventKey={"Restore from Seed"} title={"Restore from Seed"}>
          <div className="restore-form">
            <CreateWizardForm
              wizardState={state}
              onSubmit={onClickConf}
              setStateWalletName={setStateWalletName}
              setStateWalletPassword={setStateWalletPassword}
              setStateWalletNetwork={setStateWalletNetwork}
              setStateMnemonic={setStateMnemonic}
              setStateGapLimit={setStateGapLimit}
              submitTitle="Confirm"
            />
          </div>
        </Tab>

        {isElectron() ? (
          <Tab
            eventKey="Restore from Backup File"
            title="Restore from Backup File"
          >
            <div className="restore-form">
              <div className="inputs-item">
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  onChange={setStateWalletPassword}
                />
                <span className={"eye-icon"} onClick={toggleShowPass}>
                  {showPass ? (
                    <img alt="eyeIconOff" src={eyeIconOff} />
                  ) : (
                    <img alt="eyeIcon" src={eyeIcon} />
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSelectBackupFile}
                className="Body-button blue backup-btn"
              >
                Select Your Backup File
              </button>
            </div>
          </Tab>
        ) : (
          <Tab
            eventKey="Restore from Backup File"
            title="Restore from Backup File"
          >
            <div className="restore-form">
              <p>
                Mercury Wallet web version does not support loading wallets from
                file, please download and use the electron wallet to restore
                from file. You can download mercury wallet below:
              </p>
              <br />
              <a href="http://mercurywallet.com" rel="noreferrer">
                Mercury Wallet
              </a>
            </div>
          </Tab>
        )}
      </Tabs>
    </div>
  );
};

export default withRouter(RestoreWalletPage);
