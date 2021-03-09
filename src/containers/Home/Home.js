import React from 'react';
import { withRouter, useParams } from "react-router-dom";
import {useSelector, useDispatch} from 'react-redux'

import { walletLoad, walletFromMnemonic, callGetUnspentStatecoins, updateBalanceInfo, updateFeeInfo, callGetFeeInfo, callNewSeAddr } from '../../features/WalletDataSlice'
import { PanelControl, PanelConnectivity, PanelCoinsActivity } from '../../components'

// Home page is the main page from which a user can view and use their Wallet.
// Provided with props Home is used to initiliase a Wallet into the Redux state.
const HomePage = (props) => {
  const dispatch = useDispatch();

  // Initiliase wallet data in Redux state
  const initWalletInRedux = () => {
    // Get coins info
    const [coins_data, total_balance] = callGetUnspentStatecoins();
    dispatch(updateBalanceInfo({total_balance: total_balance, num_coins: coins_data.length}));
    // Get fee info
    const fee_info = callGetFeeInfo().then((fee_info) => {
      dispatch(updateFeeInfo(fee_info));
    })
    callNewSeAddr()
   // const ping_swap = callPingSwap().then((ping_swap) => {
   //   dispatch(updatePingSwap(ping_swap));
   // })
  }

  // Load or create wallet if come from Welcome screens
  let { wallet_setup } = useParams(); // get wallet_name, password and mnemonic from url
  if (!props.walletLoaded) {
    if (props.loadWallet) {
      wallet_setup = JSON.parse(wallet_setup)
      // load wallet into Redux
      walletLoad(wallet_setup.wallet_name, wallet_setup.wallet_password);
      props.setWalletLoaded(true);
    } else if (props.createWallet){
      wallet_setup = JSON.parse(wallet_setup)
      // Create new wallet form mnemonic
      walletFromMnemonic(wallet_setup.wallet_name, wallet_setup.wallet_password, wallet_setup.mnemonic);
      props.setWalletLoaded(true);
    }
    initWalletInRedux()
  }

  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity />
      <PanelCoinsActivity />
    </div>
  )
}

export default withRouter(HomePage);
