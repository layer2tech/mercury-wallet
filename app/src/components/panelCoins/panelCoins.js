import React from 'react';
import Coin from "./Coin/Coin";

import './panelCoins.css';
import '../index.css';

const PanelCoins = () => {
  return (
    <div className="Body">
      <div className="CoinsPanel">
        <Coin />
        <Coin />
      </div>
    </div>
  );
}

export default PanelCoins;
