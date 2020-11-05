import React from 'react';

import './Coin.css';
import '../../index.css';

const Coin = () => {
  return (
    <div className="Body">
      <div className="CoinPanel">
        <b className="CoinAmount">0.1 BTC</b>
        <small className="CoinTimeLeft">11.5 months</small>
        <b className="CoinAddress">15ke...0933d</b>
      </div>
    </div>
  );
}

export default Coin;
