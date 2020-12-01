import React from 'react';
import {useSelector} from 'react-redux'
import {Tabs, Tab} from 'react-bootstrap';
import Coin from "./Coin/Coin";
import Activity from "../activity/activity";
import './panelCoins.css';
import '../index.css';

const PanelCoins = () => {
    const coinData = useSelector(state => state.coinData)

    const printCoinData = coinData.coins.map(item => (
        <article key={item.id}>
            <Coin amount={item.amount} time_left={item.time_left}
                  funding_txid={item.funding_txid.slice(0, 10) + "..."}/>
        </article>
    ))
    return (
        <div className="table">
            <div className="CoinsPanel">
                <Tabs defaultActiveKey="STATECOIN UTXO'S">
                    <Tab eventKey="STATECOIN UTXO'S" title="STATECOIN UTXO'S">
                        {printCoinData}
                    </Tab>
                    <Tab eventKey="ACTIVITY" title="ACTIVITY">
                        <Activity/>

                    </Tab>

                </Tabs>


            </div>
        </div>
    );
}

export default PanelCoins;
