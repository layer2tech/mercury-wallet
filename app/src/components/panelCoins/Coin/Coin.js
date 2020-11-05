import React from 'react';

import './Coin.css';
import '../../index.css';

const Coin = (props) => {
  return (
    <div className="Body">
      <div className="CoinPanel">
        <b className="CoinAmount">{props.amount} BTC</b>
        <small className="CoinTimeLeft">{props.time_left} months</small>
        <b className="CoinAddress">{props.address}</b>
      </div>
    </div>
  );
}

export default Coin;
