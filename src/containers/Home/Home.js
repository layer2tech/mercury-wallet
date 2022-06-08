import React from 'react';
import {withRouter, Redirect} from "react-router-dom";
import {useSelector, useDispatch} from 'react-redux'

import {
  isWalletLoaded,
  updateFeeInfo,
  callGetFeeInfo,
  callGetConfig
} from "../../features/WalletDataSlice";
import {
  PanelControl,
  PanelConnectivity,
  PanelCoinsActivity,
  Tutorial
} from "../../components";

// Logger import.
// Node friendly importing required for Jest tests.
let log;
try {
  log = window.require('electron-log');
} catch (e) {
  log = require('electron-log');
}

// Home page is the main page from which a user can view and use their Wallet.
// Provided with props Home is used to initiliase a Wallet into the Redux state.
const HomePage = (props) => {
  
  const dispatch = useDispatch();
  let fee_info = useSelector(state => state.walletData).fee_info;

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  // Initiliase wallet data in Redux state
  const initWalletInRedux = () => {
    // Get fee info
    fee_info = callGetFeeInfo().then((fee_info) => {
      dispatch(updateFeeInfo(fee_info));
    }).catch((err) => {
      const err_str = err?.message
      if (err_str && (err_str.includes('Network Error') ||
        err_str.includes('Mercury API request timed out'))) {
        log.warn(JSON.stringify(err_str))
      } else {
        throw err
      }
    })
    
  }
  // Check if wallet initialised
  if (fee_info.deposit==="NA") { initWalletInRedux() }

  let current_config;
  try {
    current_config = callGetConfig();
  } catch(error) {
    console.warn('Can not get config', error)
  }
  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity online = {props.online}/>
      <PanelCoinsActivity />
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}

export default withRouter(HomePage);
