import React, {useState} from 'react';
import {Tabs, Tab} from 'react-bootstrap';

import { Coins, Activity } from "..";

import './panelCoinsActivity.css';
import '../index.css';

const PanelCoinsActivity = (props) => {
    const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id

    const setSelectedCoin = (statechain_id) => {
        setSelectedCoins(
            prevSelectedCoins => {
                let newSelectedCoins=[];
                const isStatechainId = (element) => element == statechain_id; 
                let index = prevSelectedCoins.findIndex(isStatechainId);
                if (index == -1){
                    newSelectedCoins=[statechain_id];
                }
                return newSelectedCoins;
            }
        );
    }

    return (
        <div className="table">
            <div className="CoinsPanel">
                <Tabs defaultActiveKey="STATECOIN UTXO'S">
                    <Tab eventKey="STATECOIN UTXO'S" title="STATECOIN UTXO'S">
                        <Coins
                          displayDetailsOnClick={true}
                          selectedCoins={selectedCoins}
                          setSelectedCoins={setSelectedCoins}
                          setSelectedCoin={setSelectedCoin}
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
