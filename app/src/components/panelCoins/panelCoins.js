import React from 'react';
import { useSelector } from 'react-redux'

import Coin from "./Coin/Coin";

import './panelCoins.css';
import '../index.css';

const PanelCoins = () => {
  const coinData = useSelector(state => state.coinData)

  const printCoinData = coinData.coins.map(item => (
    <article key={item.id}>
      <Coin amount={item.amount} time_left={item.time_left} funding_txid={item.funding_txid.slice(0,10) + "..."}/>
    </article>
  ))
  return (
    <div className="Body">
      <div className="CoinsPanel">
        {printCoinData}
      </div>
    </div>
  );
}

export default PanelCoins;
