import React from 'react';
import {useSelector} from 'react-redux'
import {Tabs, Tab} from 'react-bootstrap';

import { Coins, Activity } from "..";

import './panelCoinsActivity.css';
import '../index.css';

const PanelCoins = () => {
    const wallet = useSelector(state => state.walletData).wallet

    return (
        <div className="table">
            <div className="CoinsPanel">
                <Tabs defaultActiveKey="STATECOIN UTXO'S">
                    <Tab eventKey="STATECOIN UTXO'S" title="STATECOIN UTXO'S">
                        <Coins displayDetailsOnClick="true"/>
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
