import React from 'react';

import './panelConnectivity.css';
import '../index.css';

const PanelConnectivity = () => {
  return (
    <div className="Body">
      <div className="ConnectionsPanel">
        <b className="ConnectionStateChain">Connected to StateChain</b>
        <b className="ConnectionSwaps">Connected to Swaps</b>
      </div>
    </div>
  );
}

export default PanelConnectivity;
