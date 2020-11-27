import React from 'react';

import './Coin.css';
import '../../index.css';

const Coin = (props) => {
  return (
    <div>
      <div className="CoinPanel">
        <b className="CoinAmount">{props.amount} BTC</b>
        <small className="CoinTimeLeft">{props.time_left} months</small>
        <b className="CoinFundingTxid">{props.funding_txid}</b>
      </div>
    </div>
  );
}

export default Coin;
