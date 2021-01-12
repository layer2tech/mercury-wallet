import React from 'react';
import { withRouter } from "react-router-dom";
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'

import { PanelControl, PanelConnectivity, PanelCoins } from '../../components'
import { refreshCoinData, callDeposit } from '../../features/WalletDataSlice'

const HomePage = () => {

  // Refresh Coins list
  const dispatch = useDispatch();
  dispatch(refreshCoinData())

  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity />
      <PanelCoins />
    </div>
  )
}

export default withRouter(HomePage);
