"use strict";
import settings from "../../images/settings.png";

import React, { useState, useEffect } from "react";
import { Link, withRouter, Redirect } from "react-router-dom";
import { useDispatch } from "react-redux";
import icon2 from "../../images/icon2.png";
import info from "../../images/info.png";

import {
  StdButton,
  CheckBox,
  ConfirmPopup,
  BackupWalletPopup,
  CopiedButton,
} from "../../components";
import {
  isWalletLoaded,
  setNotification as setNotificationMsg,
  callGetConfig,
  callUpdateConfig,
  callClearSave,
  unloadWallet,
  stopWallet,
  callGetActivityLogItems,
  callGetActivityLog,
  callGetArgsHasTestnet,
  callGetPassword,
  callGetMnemonic,
  callCheckCoins,
  callDeriveXpub,
  setWalletLoaded,
  getNetworkType,
  callIsTestnet,
  callGetNetwork,
} from "../../features/WalletDataSlice";

import Loading from "../../components/Loading/Loading";

import "./Settings.css";
import Tutorial from "../../components/Tutorial";

let bitcoin = require("bitcoinjs-lib");

const NETWORK_CONFIG = require("../../network.json");

export const defaultWalletConfig = async () => {
  
  let networkType = getNetworkType();
  networkType = (networkType === undefined) ? "tor" : networkType.toLowerCase();
  if (callGetNetwork() === bitcoin.networks.testnet) {
    console.log("use testnet network settings");
    return {
      network: bitcoin.networks.testnet,
      notifications: false,
      singleSwapMode: false,
      tutorials: false,
      state_entity_endpoint: NETWORK_CONFIG[networkType].testnet_state_entity_endpoint,
      swap_conductor_endpoint: NETWORK_CONFIG[networkType].testnet_swap_conductor_endpoint,
      block_explorer_endpoint: NETWORK_CONFIG[networkType].testnet_block_explorer_endpoint,
      electrum_config: process.env.TESTNET_ELECTRUM_CONFIG
      ? process.env.TESTNET_ELECTRUM_CONFIG
      :NETWORK_CONFIG[networkType].testnet_electrum_config,
      tor_proxy:  NETWORK_CONFIG[networkType].proxy,
      min_anon_set: "",
    };
  } else {
    console.log("use mainnet network settings");
    return {
      network: bitcoin.networks.bitcoin,
      notifications: false,
      singleSwapMode: false,
      tutorials: false,
      state_entity_endpoint: NETWORK_CONFIG[networkType].mainnet_state_entity_endpoint,
      swap_conductor_endpoint: NETWORK_CONFIG[networkType].mainnet_swap_conductor_endpoint,
      block_explorer_endpoint: NETWORK_CONFIG[networkType].mainnet_block_explorer_endpoint,
      electrum_config: process.env.MAINNET_ELECTRUM_CONFIG
      ? process.env.MAINNET_ELECTRUM_CONFIG
      :NETWORK_CONFIG[networkType].mainnet_electrum_config,
      tor_proxy: NETWORK_CONFIG[networkType].proxy,
      min_anon_set: "",
    };
  }
};

const SettingsPage = (props) => {
  const dispatch = useDispatch();

  let config;
  try {
    config = callGetConfig();
  } catch (error) {
    console.warn("Can not get config", error);
  }

  const [notifications, setNotification] = useState(config.notifications);
  const [singleSwapMode, setSingleSwapMode] = useState(config.singleSwapMode);
  const [tutorials, setTutorials] = useState(config.tutorials);
  const [stateEntityAddr, setStateEntityAddr] = useState(
    config.state_entity_endpoint
  );
  const [swapAddr, setSwapAddr] = useState(config.swap_conductor_endpoint);
  const [elecAddr, setElecAddr] = useState(config.electrum_config);
  const [blockExplorer, setBlockExplorer] = useState(
    config.block_explorer_endpoint
  );
  const [torProxy, setTorProxy] = useState(config.tor_proxy);
  const [minAnonSet, setMinAnonSet] = useState(config.min_anon_set);
  const [openBackupModal, setOpenBackupModal] = useState(false);
  const [password, setPassword] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [networkType, setNetworkType] = useState(getNetworkType())

  useEffect(() => {
    if (
      (password && password === callGetPassword()) ||
      "" === callGetPassword()
    ) {
      setPasswordConfirm(true);
    }
  }, [password]);

  // Change handlers
  const onNotificationChange = ({ checked }) => {
    setNotification(checked);
  };
  const onSingleSwapModeChange = ({ checked }) => {
    setSingleSwapMode(checked);
  };
  //const onTutorialChange = ({checked}) => { setTutorials(checked) };
  const onStateEntityAddrChange = (evt) => {
    setStateEntityAddr(evt.target.value);
  };
  const onSwapAddrChange = (evt) => {
    setSwapAddr(evt.target.value);
  };
  const onElecAddrChange = (evt) => {
    setElecAddr({
      ...elecAddr,
      [evt.target.name]: evt.target.value,
    });
  };

  const onBlockExpChange = (evt) => {
    let url = evt.target.value;
    setBlockExplorer(url);
  };

  const onTorProxyChange = (evt) => {
    setTorProxy({
      ...torProxy,
      [evt.target.name]: evt.target.value,
    });
  };
  //const decreaseMinAnonSet = (e) => { minAnonSet>3 ? (setMinAnonSet(minAnonSet-1)):(e.preventDefault()) };
  //const increaseMinAnonSet = (e) => { minAnonSet>=10?(e.preventDefault()):(setMinAnonSet(minAnonSet+1))};

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  // buttons
  const saveButtonOnClick = () => {
    callUpdateConfig({
      state_entity_endpoint: stateEntityAddr,
      swap_conductor_endpoint: swapAddr,
      block_explorer_endpoint: blockExplorer,
      electrum_config: elecAddr,
      tor_proxy: torProxy,
      min_anon_set: minAnonSet,
      notifications: notifications,
      singleSwapMode: singleSwapMode,
      tutorials: tutorials,
    });
    dispatch(setNotificationMsg({ msg: "Settings successfully updated." }));
  };

  const cancelButtonOnClick = () => {
    setNotification(config.notifications);
    setSingleSwapMode(config.singleSwapMode);
    setTutorials(config.tutorials);
    setStateEntityAddr(config.state_entity_endpoint);
    setSwapAddr(config.swap_conductor_endpoint);
    setBlockExplorer(config.block_explorer_endpoint);
    setElecAddr(config.electrum_config);
    setTorProxy(config.tor_proxy);
    setMinAnonSet(config.min_anon_set);
  };

  const checkButtonOnClick = async () => {
    setCheckLoading(true);
    let count = await callCheckCoins();
    dispatch(
      setNotificationMsg({ msg: "Found " + count + " duplicate deposits" })
    );
    setCheckLoading(false);
  };

  const clearWalletButtonOnClick = async () => {
    await stopWallet();
    dispatch(callClearSave());
    unloadWallet();
    dispatch(setWalletLoaded({ loaded: false }));
  };

  const onPasswordChange = (event) => {
    setPassword(event.target.value);
  };
  const onButtonPress = (event) => {
    setShowSeed(!showSeed);
  };

  const downloadActivity = () => {
    let activity_data = callGetActivityLogItems();
    activity_data = JSON.stringify(activity_data);

    var a = document.createElement("a");
    var file = new Blob([activity_data], { type: "text/plain" }); //text/plain

    a.href = URL.createObjectURL(file);
    a.download = "activity.txt";
    a.click();
  };

  const copyWithdrawTxHexToClipboard = () => {
    navigator.clipboard.writeText(callDeriveXpub());
  };

  return (
    <div className={`${config.tutorials ? "container-with-tutorials" : ""}`}>
      <div className="container">
        <div className="Body settings">
          <div className="swap-header">
            <h2 className="main-header">
              <img src={settings} alt="question" />
              Settings
            </h2>
            <div>
              <Link to="/home">
                <StdButton label="Back" className="Body-button transparent" />
              </Link>
            </div>
          </div>
          <div className="wrap-btns">
            <StdButton
              label="Create wallet backup"
              className="Body-button blue"
              onClick={() => setOpenBackupModal(true)}
            />
            <Link to="backup_tx">
              <StdButton
                label="Manage Back-up transactions"
                className="Body-button blue"
              />
            </Link>
            <StdButton
              label="Export activity log"
              className="Body-button transparent"
              onClick={() => downloadActivity()}
            />
          </div>
        </div>
        <div className="Body settings">
          <div className="content">
            <div className="inputs">
              <h2>Connectivity Settings</h2>
              <form>
                <div className="inputs-item">
                  <input
                    id="address-host"
                    type="text"
                    name="host"
                    value={elecAddr.host}
                    onChange={onElecAddrChange}
                    required
                  />
                  <label className="control-label" htmlFor="address-host">
                    Electrumx Server Host
                  </label>
                </div>
                <div className="inputs-item">
                  <input
                    id="block-exp"
                    type="text"
                    name="blockExplorer"
                    value={blockExplorer}
                    onChange={onBlockExpChange}
                    required
                  />
                  <label className="control-label" htmlFor="block-exp">
                    BlockExplorer URL
                  </label>
                </div>
                <div className="d-flex input-group">
                  <div className="inputs-item">
                    <input
                      id="address-port"
                      type="number"
                      name="port"
                      value={elecAddr.port}
                      onChange={onElecAddrChange}
                      required
                    />
                    <label className="control-label" htmlFor="address-port">
                      Server Port
                    </label>
                  </div>
                  <div className="inputs-item protocol">
                    <input
                      id="address-protocol"
                      type="text"
                      name="protocol"
                      value={elecAddr.protocol}
                      onChange={onElecAddrChange}
                      required
                    />
                    <label className="control-label" htmlFor="address-protocol">
                      Server Protocol
                    </label>
                  </div>
                  <div className="inputs-item type">
                    <input
                      id="address-type"
                      type="text"
                      name="type"
                      value={elecAddr.type}
                      onChange={onElecAddrChange}
                      required
                    />
                    <label className="control-label" htmlFor="address-type">
                      Server Type
                    </label>
                  </div>
                </div>
                <div className="inputs-item">
                  <input
                    id="proxy-ip"
                    type="text"
                    name="ip"
                    value={torProxy.ip}
                    onChange={onTorProxyChange}
                    required
                  />
                  <label className="control-label" htmlFor="proxy-ip">
                    {networkType} Proxy Host
                  </label>
                </div>
                <div className="inputs-item">
                  <input
                    id="proxy-port"
                    type="number"
                    name="port"
                    value={torProxy.port}
                    onChange={onTorProxyChange}
                    required
                  />
                  <label className="control-label" htmlFor="proxy-port">
                    {networkType} Proxy Port
                  </label>
                </div>
                <div className="inputs-item">
                  <input
                    id="proxy-controlPassword"
                    type="text"
                    name="controlPassword"
                    value={torProxy.controlPassword}
                    onChange={onTorProxyChange}
                    required
                  />
                  <label
                    className="control-label"
                    htmlFor="proxy-controlPassword"
                  >
                    {networkType} Proxy Control Password
                  </label>
                </div>
                <div className="inputs-item">
                  <input
                    id="proxy-controlPort"
                    type="number"
                    name="controlPort"
                    value={torProxy.controlPort}
                    onChange={onTorProxyChange}
                    required
                  />
                  <label className="control-label" htmlFor="proxy-controlPort">
                    { networkType } Proxy Control Port
                  </label>
                </div>
                <div className="inputs-item">
                  <input
                    id="entity-address"
                    type="text"
                    name="StateChain Entity Address"
                    value={stateEntityAddr}
                    onChange={onStateEntityAddrChange}
                    required
                  />
                  <label className="control-label" htmlFor="entity-address">
                    State entity endpoint
                  </label>
                </div>
                <div className="inputs-item">
                  <input
                    id="conductor-address"
                    type="text"
                    name="Swap Conductor Address"
                    value={swapAddr}
                    onChange={onSwapAddrChange}
                    required
                  />
                  <label className="control-label" htmlFor="conductor-address">
                    Swap conductor endpoint
                  </label>
                </div>
                {/*
                            <div className="inputs-item def-number-input number-input">
                                <span onClick={decreaseMinAnonSet} className="minus update-min-anon-set" />

                                <input className="quantity" name="quantity" value={minAnonSet}
                                      type="text" placeholder="0 BTC"/>
                                <label className="control-label"
                                        htmlFor="Anonymity Set">Swap group size</label>
                                <span onClick={increaseMinAnonSet} className="plus update-min-anon-set" />
                            </div>
                          */}
              </form>
            </div>
            <div className="inputs">
              <h2>Date/Time Format</h2>
              <select name="1" id="1">
                <option value="1">mm/dd/yyyy HH:mm:ss</option>
              </select>
              <div className="checkbox-group">
                <CheckBox
                  label="Notifications"
                  description="Toggle notifications"
                  checked={!!notifications}
                  onChange={onNotificationChange}
                />
                <CheckBox
                  label="Single swap mode"
                  description="Toggle single swap mode"
                  checked={!!singleSwapMode}
                  onChange={onSingleSwapModeChange}
                />
                {/* <CheckBox
                          label="Tutorials"
                          description="Toggle show tutorials"
                          checked={!!tutorials}
                          onChange={onTutorialChange}
                        /> */}
              </div>
              <div className="seed-phrase">
                <h2>Seed Phrase</h2>
                {passwordConfirm ? (
                  showSeed ? (
                    <div>
                      <p>{callGetMnemonic()}</p>
                      <button
                        onClick={() => onButtonPress()}
                        className="Body-button transparent"
                      >
                        {" "}
                        Hide{" "}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => onButtonPress()}
                        className="Body-button transparent"
                      >
                        {" "}
                        Show{" "}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="inputs-item">
                    <input type="password" onChange={onPasswordChange} />
                    <label> Enter password </label>
                  </div>
                )}
              </div>
              <h2> </h2>
              <div className="action-btn-check">
                <button
                  type="button"
                  title="Check for duplicate deposits paid to the same statecoin shared key. Warning: This operation queries electrum server with all wallet addresses."
                  className="action-btn-blue"
                  onClick={
                    checkLoading === false
                      ? checkButtonOnClick
                      : (e) => {
                          e.stopPropagation();
                        }
                  }
                >
                  {checkLoading ? <Loading /> : `Check for duplicate coins`}
                </button>
              </div>
              <div className="xpub">
                <div className="title-container">
                  <div className="info-container">
                    <img src={info} alt="info" />
                    <span className="tooltip-info index">
                      <div>
                        <h6>xPub: transfer all statecoins to a new wallet.</h6>
                        For best privacy practice send statecoins to an xpub
                        instead of a statecoin address. Each statecoin is sent
                        to a separate statecoin address. Statecoins are sent to
                        the first X indexes found on the receive page.
                      </div>
                    </span>
                  </div>
                  <span>
                    <h2>xPub</h2>
                  </span>
                </div>
                <div className="txhex-container">
                  <CopiedButton
                    handleCopy={() => copyWithdrawTxHexToClipboard()}
                  >
                    <div className="copy-hex-wrap coin-modal-hex">
                      <img type="button" src={icon2} alt="icon" />
                      <span>{callDeriveXpub()}</span>
                    </div>
                  </CopiedButton>
                </div>
              </div>
            </div>
          </div>
          <div className="action-btns">
            <button
              type="button"
              className="Body-button transparent"
              onClick={cancelButtonOnClick}
            >
              Cancel
            </button>
            <button
              type="button"
              className="action-btn-blue"
              onClick={saveButtonOnClick}
            >
              Save
            </button>
          </div>
        </div>
        {config.testing_mode ? (
          <ConfirmPopup onOk={clearWalletButtonOnClick}>
            <button type="button" className="Body-button blue">
              Clear wallet memory
            </button>
          </ConfirmPopup>
        ) : null}
        <BackupWalletPopup
          close={() => setOpenBackupModal(false)}
          show={openBackupModal}
        />
      </div>
      {config.tutorials && <Tutorial />}
    </div>
  );
};

export default withRouter(SettingsPage);
