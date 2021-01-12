import React from 'react';
import { withRouter } from "react-router-dom";

import { PanelControl, PanelConnectivity, PanelCoins } from '../../components'

const HomePage = () => {
  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity />
      <PanelCoins />
    </div>
  )
}

export default withRouter(HomePage);
