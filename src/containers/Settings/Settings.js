import settings from "../../images/settings.png";

import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";

import {StdButton} from "../../components";
import {callGetConfig, callUpdateConfig} from '../../features/WalletDataSlice'


import './Settings.css';

const SettingsPage = () => {
  const current_config = callGetConfig();
  const [config, setConfig] = useState(current_config);
  const [notifications, setNotification] = useState(current_config.notifications);
  const [tutorials, setTutorials] = useState(current_config.tutorials);
  const [stateEntityAddr, setStateEntityAddr] = useState(config.state_entity_endpoint);
  const [swapAddr, setSwapAddr] = useState(config.swap_conductor_endpoint);
  const [elecAddr, setElecAddr] = useState(config.electrum_config.host);
  const [torProxy, setTorProxy] = useState(config.tor_proxy);
  const [minAnonSet, setMinAnonSet] = useState(config.min_anon_set);


  const onNotificationChange = () => {
    setNotification(!notifications);
  };
  const onTutorialChange = () => {
    setTutorials(!tutorials);
  };
  const onStateEntityAddrChange = (evt) => {
    setStateEntityAddr(evt.target.value);
  }
  const onSwapAddrChange = (evt) => {
    setSwapAddr(evt.target.value);
  }
  const onElecAddrChange = (evt) => {
      setElecAddr(evt.target.value);
  }
  const onTorProxyChange = (evt) => {
      setTorProxy(evt.target.value);
  }
  const decreaseMinAnonSet = () => {
      setMinAnonSet(minAnonSet-1);
  }
  const increaseMinAnonSet = () => {
      setMinAnonSet(minAnonSet+1);
  }


  const saveButtonOnClick = (event) => {
      callUpdateConfig({
        state_entity_endpoint: stateEntityAddr,
        swap_conductor_endpoint: swapAddr,
        electrum_config: {
          host: elecAddr,
          port: 8443,
          protocol: 'wss',
        },
        tor_proxy: torProxy,
        min_anon_set: minAnonSet,
        notifications: notifications,
        tutorials: tutorials
      })
  }

    return (
        <div className="container">
            <p> Settings page is under construction. </p>
            <div className="Body settings">
                <div className="swap-header">
                    <h2 className="WalletAmount">
                        <img src={settings} alt="question"/>
                        Settings
                    </h2>
                    <div>
                        <Link className="nav-link" to="/">
                            <StdButton
                                label="Back"
                                className="Body-button transparent"/>
                        </Link>
                    </div>

                </div>
                <div className="buttons">
                    <Link className="nav-link" to="/">
                        <StdButton
                            label="Create wallet backup"
                            className="Body-button blue"/>
                    </Link>

                    <Link className="nav-link" to="/backup_tx">
                        <StdButton
                            label="Manage Back-up transactions"
                            className="Body-button blue"/>
                    </Link>

                    <Link className="nav-link" to="/">
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
                                <input id="address" type="text" name="Electrumx Address" value={elecAddr}
                                       onChange={onElecAddrChange} required/>
                                <label className="control-label"
                                       htmlFor="address">Electrumx Server Address</label>
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
                                <button onClick={decreaseMinAnonSet} className="minus"></button>

                                <input className="quantity" name="quantity" value={minAnonSet}
                                       type="number" placeholder="0 BTC"/>
                                <button onClick={increaseMinAnonSet} className="plus"></button>
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
                    <StdButton
                        label="Cancel"
                        className="Body-button bg-transparent"/>
                    <StdButton
                        label="Save"
                        className="Body-button blue"
                        onClick={saveButtonOnClick}/>
                </div>

            </div>
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
