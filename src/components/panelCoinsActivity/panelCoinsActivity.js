import React, {useState} from 'react';
import {Tabs, Tab} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { STATECOIN_STATUS } from '../../wallet/statecoin'

import { Coins, Activity } from "..";

import './panelCoinsActivity.css';
import '../index.css';

const PanelCoinsActivity = (props) => {
    const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id
    const { filterBy } = useSelector(state => state.walletData);
    const defaultTabTitle = filterBy === STATECOIN_STATUS.WITHDRAWN ? `WITHDRAWN STATECOIN UTXO’S` : `STATECOIN UTXO'S`

    return (
        <div className="table">
            <div className="CoinsPanel">
                {filterBy !== STATECOIN_STATUS.WITHDRAWN && (
                    <Tabs defaultActiveKey={defaultTabTitle}>
                        <Tab eventKey={defaultTabTitle} title={defaultTabTitle}>
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
                )}
                {filterBy === STATECOIN_STATUS.WITHDRAWN && (
                    <>
                        <div className="withdrawn-tab">{defaultTabTitle}</div>
                        <Coins
                            displayDetailsOnClick={true}
                            selectedCoin={selectedCoin}
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
