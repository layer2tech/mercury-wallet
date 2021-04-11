import React, {useState} from 'react';
import {Tabs, Tab} from 'react-bootstrap';

import { Coins, Activity } from "..";

import './panelCoinsActivity.css';
import '../index.css';

const PanelCoinsActivity = (props) => {
    const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id

    return (
        <div className="table">
            <div className="CoinsPanel">
                <Tabs defaultActiveKey="STATECOIN UTXO'S">
                    <Tab eventKey="STATECOIN UTXO'S" title="STATECOIN UTXO'S">
                        <Coins
                          displayDetailsOnClick={true}
                          selectedCoin={selectedCoin}
                          setSelectedCoin={setSelectedCoin}
                          showCoinStatus={true}
                        />
                    </Tab>
                    <Tab eventKey="ACTIVITY" title="ACTIVITY">
                        <Activity/>
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
}

export default PanelCoinsActivity;
