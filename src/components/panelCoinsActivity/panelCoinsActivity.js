import React, {useState} from 'react';
import {Tabs, Tab} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { STATECOIN_STATUS } from '../../wallet/statecoin'

import { Coins, Activity } from "..";

import './panelCoinsActivity.css';
import '../index.css';

const PanelCoinsActivity = (props) => {
    const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
    const { filterBy } = useSelector(state => state.walletData);
    const defaultTabTitle = filterBy === STATECOIN_STATUS.WITHDRAWN ? `WITHDRAWN STATECOINS` : `STATECOINS`
        
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
                {filterBy !== STATECOIN_STATUS.WITHDRAWN && (
                    <Tabs defaultActiveKey={defaultTabTitle}>
                        <Tab eventKey={defaultTabTitle} title={defaultTabTitle}>
                            <Coins
                                displayDetailsOnClick={true}
                                selectedCoins={selectedCoins}
                                setSelectedCoins={setSelectedCoins}
                                setSelectedCoin={setSelectedCoin}
                                showCoinStatus={true}
                                largeScreen
                            />
                        </Tab>
                        <Tab eventKey="ACTIVITY" title="ACTIVITY">
                            <Activity/>
                        </Tab>
                    </Tabs>
                )}
                {filterBy === STATECOIN_STATUS.WITHDRAWN && (
                    <>
                        <div className="withdrawn-tab">{defaultTabTitle}</div>
                        <Coins
                            displayDetailsOnClick={true}
                            selectedCoins={selectedCoins}
                            setSelectedCoins={setSelectedCoins}
                            setSelectedCoin={setSelectedCoin}
                            showCoinStatus={true}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default PanelCoinsActivity;
