import React from 'react';
import { withRouter } from "react-router-dom";

import { PanelControl, PanelConnectivity, PanelCoinsActivity } from '../../components'

const HomePage = () => {
  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity />
      <PanelCoinsActivity />
    </div>
  )
}

export default withRouter(HomePage);
