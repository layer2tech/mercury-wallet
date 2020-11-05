import React from 'react';
import { PanelControl, PanelConnectivity, PanelCoins } from '../../components'

import { withRouter } from "react-router-dom";


const HomePage = () => {
  return (
    <div className="home-page">
      <PanelControl />
      <PanelConnectivity />
      <PanelCoins />
    </div>
  )
}

export default withRouter(HomePage);
