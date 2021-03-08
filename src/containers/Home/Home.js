import React from 'react';
import {withRouter, useParams, Redirect} from "react-router-dom";
import {useSelector, useDispatch} from 'react-redux'

import {setError, isWalletLoaded, updateFeeInfo, callGetFeeInfo} from '../../features/WalletDataSlice'
import {PanelControl, PanelConnectivity, PanelCoinsActivity} from '../../components'

// Home page is the main page from which a user can view and use their Wallet.
// Provided with props Home is used to initiliase a Wallet into the Redux state.
const HomePage = () => {
  const dispatch = useDispatch();
  const fee_info = useSelector(state => state.walletData).fee_info;

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    dispatch(setError({msg: "No Wallet loaded."}))
    return <Redirect to="/" />;
 }

  // Initiliase wallet data in Redux state
  const initWalletInRedux = () => {
    // Get fee info
    const fee_info = callGetFeeInfo().then((fee_info) => {
      dispatch(updateFeeInfo(fee_info));
    })
  }
  // Check if wallet initialised
  if (fee_info.deposit==="NA") { initWalletInRedux() }

  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity />
      <PanelCoinsActivity />
    </div>
  )
}

export default withRouter(HomePage);
