import settings from "../../images/settings.png";

import React, {useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {StdButton} from "../../components";
import {isWalletLoaded, setNotification as setNotificationMsg, callGetConfig,
  callUpdateConfig, callClearSave, unloadWallet} from '../../features/WalletDataSlice'

import './Settings.css';

const SettingsPage = (props) => {
  const dispatch = useDispatch();

  let current_config;
  try {
    current_config = callGetConfig();
  } catch {
    current_config = {notifications: "", tutorials: "", state_entity_endpoint: "", swap_conductor_endpoint: "",
      electrum_config: {host: "", port: 0, protocol: ""}, tor_proxy: "", min_anon_set: ""};
  }

  const [notifications, setNotification] = useState(current_config.notifications);
  const [tutorials, setTutorials] = useState(current_config.tutorials);
  const [stateEntityAddr, setStateEntityAddr] = useState(current_config.state_entity_endpoint);
  const [swapAddr, setSwapAddr] = useState(current_config.swap_conductor_endpoint);
  const [elecAddrHost, setElecAddrHost] = useState(current_config.electrum_config.host);
  const [elecAddrPort, setElecAddrPort] = useState(current_config.electrum_config.port);
  const [elecAddrProtocol, setElecAddrProtocol] = useState(current_config.electrum_config.protocol);
  const [torProxy, setTorProxy] = useState(current_config.tor_proxy);
  const [minAnonSet, setMinAnonSet] = useState(current_config.min_anon_set);


  // Change handlers
  const onNotificationChange = () => { setNotification(!notifications) };
  const onTutorialChange = () => { setTutorials(!tutorials) };
  const onStateEntityAddrChange = (evt) => { setStateEntityAddr(evt.target.value) };
  const onSwapAddrChange = (evt) => { setSwapAddr(evt.target.value) };
  const onElecAddrHostChange = (evt) => { setElecAddrHost(evt.target.value) };
  const onElecAddrPortChange = (evt) => { setElecAddrPort(evt.target.value) };
  const onElecAddrProtocolChange = (evt) => { setElecAddrProtocol(evt.target.value) };
  const onTorProxyChange = (evt) => { setTorProxy(evt.target.value) };
  const decreaseMinAnonSet = () => { setMinAnonSet(minAnonSet-1) };
  const increaseMinAnonSet = () => { setMinAnonSet(minAnonSet+1) };
  const onMinAnonSetChange = (evt) => { setMinAnonSet(evt.target.value) };

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  // buttons
  const saveButtonOnClick = () => {
    callUpdateConfig({
      state_entity_endpoint: stateEntityAddr,
      swap_conductor_endpoint: swapAddr,
      electrum_config: {
        host: elecAddrHost,
        port: elecAddrPort,
        protocol: elecAddrProtocol,
      },
      tor_proxy: torProxy,
      min_anon_set: minAnonSet,
      notifications: notifications,
      tutorials: tutorials
    })
    dispatch(setNotificationMsg({msg:"Settings successfully updated."}))
  }

  const cancelButtonOnClick = () => {
    setNotification(current_config.notifications);
    setTutorials(current_config.tutorials);
    setStateEntityAddr(current_config.state_entity_endpoint);
    setSwapAddr(current_config.swap_conductor_endpoint);
    setElecAddrHost(current_config.electrum_config.host);
    setElecAddrPort(current_config.electrum_config.port)
    setElecAddrProtocol(current_config.electrum_config.protocol)
    setTorProxy(current_config.tor_proxy);
    setMinAnonSet(current_config.min_anon_set);
  }

  const clearWalletButtonOnClick = () => {
    dispatch(callClearSave());
    unloadWallet();
    props.setWalletLoaded(false);
  }

  const logOutButtonOnClick = () => {
    unloadWallet();
    props.setWalletLoaded(false);
  }

  return (
      <div className="container">
          <div className="Body settings">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={settings} alt="question"/>
                      Settings
                  </h2>
                  <div>
                      <Link className="nav-link" to="/home">
                          <StdButton
                              label="Back"
                              className="Body-button transparent"/>
                      </Link>
                  </div>

              </div>
              <div className="buttons">
                  <Link className="nav-link" to="/home">
                      <StdButton
                          label="Create wallet backup"
                          className="Body-button blue"/>
                  </Link>

                  <Link className="nav-link" to="/backup_tx">
                      <StdButton
                          label="Manage Back-up transactions"
                          className="Body-button blue"/>
                  </Link>

                  <Link className="nav-link" to="/home">
                      <StdButton
                          label="Export activity log"
                          className="Body-button bg-transparent"/>
                  </Link>

              </div>
          </div>
          <div className="Body settings">

              <div className="content">
                  <div className="inputs">
                      <h2>Connectivity Settings</h2>
                      <form>
                          <div className="inputs-item">
                              <input id="address-host" type="text" name="Electrumx Address Host" value={elecAddrHost}
                                     onChange={onElecAddrHostChange} required/>
                              <label className="control-label"
                                     htmlFor="address-host">Electrumx Server Host</label>
                          </div>
                          <div className="d-flex input-group">
                            <div className="inputs-item">
                                <input id="address-port" type="number" name="Electrumx Address Port" value={elecAddrPort}
                                      onChange={onElecAddrPortChange} required/>
                                <label className="control-label"
                                      htmlFor="address-port">Server Port</label>
                            </div>
                            <div className="inputs-item">
                                <input id="address-protocol" type="text" name="Electrumx Address Protocol" value={elecAddrProtocol}
                                      onChange={onElecAddrProtocolChange} required/>
                                <label className="control-label"
                                      htmlFor="address-protocol">Server Protocol</label>
                            </div>
                          </div>
                          <div className="inputs-item">
                              <input id="proxy" type="text" name="TorProxy" required
                                     value={torProxy} onChange={onTorProxyChange}/>
                              <label className="control-label" htmlFor="proxy">Tor Proxy</label>
                          </div>
                          <div className="inputs-item">
                              <input id="entity-address" type="text" name="StateChain Entity Address"
                                     value={stateEntityAddr} onChange={onStateEntityAddrChange}
                                     required/>
                              <label className="control-label"
                                     htmlFor="entity-address">State entity endpoint</label>
                          </div>
                          <div className="inputs-item">
                              <input id="conductor-address" type="text" name="Swap Conductor Address"
                                     value={swapAddr}
                                     onChange={onSwapAddrChange} required/>
                              <label className="control-label" htmlFor="conductor-address">Swap conductor
                                  endpoint</label>
                          </div>
                          <div className="inputs-item def-number-input number-input">
                              <span onClick={decreaseMinAnonSet} className="minus update-min-anon-set" />

                              <input className="quantity" name="quantity" value={minAnonSet}
                                     onChange={onMinAnonSetChange} type="number" placeholder="0 BTC"/>
                              <span onClick={increaseMinAnonSet} className="plus update-min-anon-set" />
                          </div>
                      </form>

                  </div>
                  <div className="inputs">
                      <h2>Date/Time Format</h2>
                      <select name="1" id="1">
                          <option value="1">mm/dd/yyyy HH:mm:ss</option>
                      </select>

                      <CheckBox
                        label={"Notifications"}
                        description={"Toggle notifications"}
                        checked={notifications}
                        onClick={onNotificationChange}/>

                      <CheckBox
                        label={"Tutorials"}
                        description={"Toggle show tutorials"}
                        checked={tutorials}
                        onClick={onTutorialChange}/>

                  </div>
              </div>
              <div className="action-btns">
                  <button
                    type="button"
                    className="Body-button bg-transparent"
                    onClick={cancelButtonOnClick}>
                      Cancel
                  </button>
                  <button
                    type="button"
                    className="Body-button blue"
                    onClick={saveButtonOnClick}>
                      Save
                  </button>
              </div>

          </div>

          <button
            type="button"
            className="Body-button blue"
            onClick={clearWalletButtonOnClick}>
              Clear wallet memory
          </button>

          <button
            type="button"
            className="Body-button blue"
            onClick={logOutButtonOnClick}>
              Log out of wallet
          </button>
      </div>
  )
}

const CheckBox = (props) => {
  return (
    <div className="btns">
        <div className="btns-radios">
            <label htmlFor="notification">{props.label}</label>
            <input id="notification" type="checkbox" className="switch"
                checked={props.checked}
                onClick={props.onClick}/>
        </div>
        <span>{props.description}</span>
    </div>
  )
}

export default withRouter(SettingsPage);
