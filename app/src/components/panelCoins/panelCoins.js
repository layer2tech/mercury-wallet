import React, { useState } from 'react';
import { useSelector } from 'react-redux'

import Coin from "./Coin/Coin";

import './panelCoins.css';
import '../index.css';

const PanelCoins = () => {
  const coinData = useSelector(state => state.coinData)

  const printCoinData = coinData.map(item => (
    <article key={item.id}>
      <Coin amount={item.amount} time_left={item.time_left} address={item.address}/>
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
