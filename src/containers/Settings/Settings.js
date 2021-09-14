import settings from "../../images/settings.png";

import React, {useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {StdButton, CheckBox, ConfirmPopup, BackupWalletPopup} from "../../components";
import {isWalletLoaded, setNotification as setNotificationMsg, callGetConfig,
  callUpdateConfig, callClearSave, unloadWallet, callGetActivityLog} from '../../features/WalletDataSlice'

import './Settings.css';
import Tutorial from "../../components/Tutorial";

export const defaultWalletConfig = () => ({
  notifications: false,
  tutorials: false,
  state_entity_endpoint: "http://zo63hfpdcmonu52pcvflmeo62s47cqdabmibeejm7bhrfxmino3fl5qd.onion",
  swap_conductor_endpoint: "http://zo63hfpdcmonu52pcvflmeo62s47cqdabmibeejm7bhrfxmino3fl5qd.onion",
  block_explorer_endpoint: "https://blockstream.info",
  electrum_config: {host: "https://explorer.blockstream.com/api", port: null, protocol: "http"},
  tor_proxy: { ip: "localhost", port: 9060, controlPassword: "password", controlPort: 9061 },
  min_anon_set: ""
})

const SettingsPage = (props) => {
  const dispatch = useDispatch();

  let current_config;
  try {
    current_config = callGetConfig();
  } catch {
    current_config = defaultWalletConfig()
  }

  const [notifications, setNotification] = useState(current_config.notifications);
  const [tutorials, setTutorials] = useState(current_config.tutorials);
  const [stateEntityAddr, setStateEntityAddr] = useState(current_config.state_entity_endpoint);
  const [swapAddr, setSwapAddr] = useState(current_config.swap_conductor_endpoint);
  const [elecAddr, setElecAddr] = useState(current_config.electrum_config);
  const [blockExplorer, setBlockExplorer] = useState(current_config.block_explorer_endpoint);
  const [torProxy, setTorProxy] = useState(current_config.tor_proxy);
  const [minAnonSet, setMinAnonSet] = useState(current_config.min_anon_set);
  const [openBackupModal, setOpenBackupModal] = useState(false);


  // Change handlers
  const onNotificationChange = ({checked}) => { setNotification(checked) };
  //const onTutorialChange = ({checked}) => { setTutorials(checked) };
  const onStateEntityAddrChange = (evt) => { setStateEntityAddr(evt.target.value) };
  const onSwapAddrChange = (evt) => { setSwapAddr(evt.target.value) };
  const onElecAddrChange = (evt) => {
    setElecAddr({
      ...elecAddr,
      [evt.target.name]: evt.target.value
    });
  }

  const onBlockExpChange = (evt) => {
    let url = evt.target.value;
    setBlockExplorer(url);
  }

  const onTorProxyChange = (evt) => { 
    setTorProxy({
      ...torProxy,
      [evt.target.name]: evt.target.value
    });
  }
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
      tutorials: tutorials
    })
    dispatch(setNotificationMsg({msg:"Settings successfully updated."}))
  }

  const cancelButtonOnClick = () => {
    setNotification(current_config.notifications);
    setTutorials(current_config.tutorials);
    setStateEntityAddr(current_config.state_entity_endpoint);
    setSwapAddr(current_config.swap_conductor_endpoint);
    setBlockExplorer(current_config.block_explorer_endpoint);
    setElecAddr(current_config.electrum_config);
    setTorProxy(current_config.tor_proxy);
    setMinAnonSet(current_config.min_anon_set);
  }

  const clearWalletButtonOnClick = () => {
    dispatch(callClearSave());
    unloadWallet();
    props.setWalletLoaded(false);
  }

  const downloadActivity = () => {
    
    let activity_data = callGetActivityLog();
    activity_data = JSON.stringify(activity_data)

    var a = document.createElement("a");
    var file = new Blob([activity_data], {type: 'text/plain'}); //text/plain

    a.href = URL.createObjectURL(file);
    a.download = 'activity.txt';
    a.click();
  }

  return (
    <div className={`${current_config.tutorials ? 'container-with-tutorials' : ''}`}>
      <div className="container">
          <div className="Body settings">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={settings} alt="question"/>
                      Settings
                  </h2>
                  <div>
                      <Link to="/home">
                          <StdButton
                              label="Back"
                              className="Body-button transparent"/>
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
                      className="Body-button blue"/>
                </Link>
                <StdButton
                    label="Export activity log"
                    className="Body-button"
                    onClick = {() => downloadActivity()}/>
              </div>
          </div>
          <div className="Body settings">

              <div className="content">
                  <div className="inputs">
                      <h2>Connectivity Settings</h2>
                      <form>
                          <div className="inputs-item">
                              <input id="address-host" type="text" name="host" value={elecAddr.host}
                                     onChange={onElecAddrChange} required/>
                              <label className="control-label"
                                     htmlFor="address-host">Electrumx Server Host</label>
                          </div>
                          <div className="inputs-item">
                              <input id="block-exp" type="text" name="blockExplorer" value={blockExplorer}
                                     onChange={onBlockExpChange} required/>
                              <label className="control-label"
                                     htmlFor="block-exp">BlockExplorer URL</label>
                          </div>
                          <div className="d-flex input-group">
                            <div className="inputs-item">
                                <input id="address-port" type="number" name="port" value={elecAddr.port}
                                      onChange={onElecAddrChange} required/>
                                <label className="control-label"
                                      htmlFor="address-port">Server Port</label>
                            </div>
                            <div className="inputs-item protocol">
                                <input id="address-protocol" type="text" name="protocol" value={elecAddr.protocol}
                                      onChange={onElecAddrChange} required/>
                                <label className="control-label"
                                      htmlFor="address-protocol">Server Protocol</label>
                            </div>
                          </div>
                          <div className="inputs-item">
                              <input id="proxy-ip" type="text" name="ip" 
                                     value={torProxy.ip} onChange={onTorProxyChange} required/>
                              <label className="control-label" htmlFor="proxy-ip">Tor Proxy Host</label>
                          </div>
                          <div className="inputs-item">
                              <input id="proxy-port" type="number" name="port" 
                                     value={torProxy.port} onChange={onTorProxyChange} required/>
                              <label className="control-label" htmlFor="proxy-port">Tor Proxy Port</label>
                          </div>
                          <div className="inputs-item">
                              <input id="proxy-controlPassword" type="text" name="controlPassword" 
                                     value={torProxy.controlPassword} onChange={onTorProxyChange} required/>
                              <label className="control-label" htmlFor="proxy-controlPassword">Tor Proxy Control Password</label>
                          </div>
                          <div className="inputs-item">
                              <input id="proxy-controlPort" type="number" name="controlPort" 
                                     value={torProxy.controlPort} onChange={onTorProxyChange} required/>
                              <label className="control-label" htmlFor="proxy-controlPort">Tor Proxy Control Port</label>
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
                          {
                          /*
                            <div className="inputs-item def-number-input number-input">
                                <span onClick={decreaseMinAnonSet} className="minus update-min-anon-set" />

                                <input className="quantity" name="quantity" value={minAnonSet}
                                      type="text" placeholder="0 BTC"/>
                                <label className="control-label"
                                        htmlFor="Anonymity Set">Swap group size</label>
                                <span onClick={increaseMinAnonSet} className="plus update-min-anon-set" />
                            </div>
                          */
                          }
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
                        {/* <CheckBox
                          label="Tutorials"
                          description="Toggle show tutorials"
                          checked={!!tutorials}
                          onChange={onTutorialChange}
                        /> */}
                      </div>

                  </div>
              </div>
              <div className="action-btns">
                  <button
                    type="button"
                    className="action-btn-normal"
                    onClick={cancelButtonOnClick}>
                      Cancel
                  </button>
                  <button
                    type="button"
                    className="action-btn-blue"
                    onClick={saveButtonOnClick}>
                      Save
                  </button>
              </div>

          </div>
          {current_config.testing_mode ?
            <ConfirmPopup
            onOk={clearWalletButtonOnClick}
            >
            <button
            type="button"
            className="Body-button blue"
            >
            Clear wallet memory
            </button>
            </ConfirmPopup>
          :
            null
          }
        <BackupWalletPopup 
          close={() => setOpenBackupModal(false)} 
          show={openBackupModal}
        />
      </div>
      { current_config.tutorials && <Tutorial />}
    </div>
  )
}

export default withRouter(SettingsPage);
