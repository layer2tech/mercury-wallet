"use strict";
import React, { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useSelector } from "react-redux";
import { STATECOIN_STATUS } from "../../wallet/statecoin";
import { Activity, CoinsList } from "..";

import "./panelCoinsActivity.css";
import "../index.css";
import { WALLET_MODE } from "../../features/WalletDataSlice";
import EmptyCoinDisplay from "../coins/EmptyCoinDisplay/EmptyCoinDisplay";
import ChannelList from "../Channels/ChannelList";

const PanelCoinsActivity = (props) => {
  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const { filterBy, walletMode } = useSelector((state) => state.walletData);

  const defaultTabTitle =
    walletMode === WALLET_MODE.STATECHAIN
      ? filterBy === STATECOIN_STATUS.WITHDRAWN
        ? `WITHDRAWN STATECOINS`
        : filterBy === STATECOIN_STATUS.WITHDRAWING
        ? `WITHDRAWAL AWAITING CONFIRMATION`
        : `STATECOINS`
      : "LIGHTNING CHANNELS";

  const setSelectedCoin = (statechain_id) => {
    setSelectedCoins((prevSelectedCoins) => {
      let newSelectedCoins = [];
      const isStatechainId = (element) => element === statechain_id;
      let index = prevSelectedCoins.findIndex(isStatechainId);
      if (index === -1) {
        newSelectedCoins = [statechain_id];
      }
      return newSelectedCoins;
    });
  };

  return (
    <div data-cy="panel-coins-activity" className="table">
      {walletMode === WALLET_MODE.STATECHAIN ? (
        <div data-cy="coins-panel" className="CoinsPanel">
          {filterBy !== STATECOIN_STATUS.WITHDRAWN &&
            filterBy !== STATECOIN_STATUS.WITHDRAWING && (
              <Tabs defaultActiveKey={defaultTabTitle}>
                <Tab eventKey={defaultTabTitle} title={defaultTabTitle}>
                  <CoinsList
                    displayDetailsOnClick={true}
                    selectedCoins={selectedCoins}
                    setSelectedCoins={setSelectedCoins}
                    setSelectedCoin={setSelectedCoin}
                    showCoinStatus={true}
                    largeScreen
                    isMainPage={true}
                  />
                </Tab>
                <Tab eventKey="ACTIVITY" title="ACTIVITY">
                  <Activity />
                </Tab>
              </Tabs>
            )}
          {filterBy === STATECOIN_STATUS.WITHDRAWN && (
            <>
              <Tabs defaultActiveKey={defaultTabTitle}>
                <Tab eventKey={defaultTabTitle} title={defaultTabTitle}>
                  <CoinsList
                    displayDetailsOnClick={true}
                    selectedCoins={selectedCoins}
                    setSelectedCoins={setSelectedCoins}
                    setSelectedCoin={setSelectedCoin}
                    showCoinStatus={true}
                  />
                </Tab>
              </Tabs>
            </>
          )}
          {filterBy === STATECOIN_STATUS.WITHDRAWING && (
            <>
              <Tabs defaultActiveKey={defaultTabTitle}>
                <Tab eventKey={defaultTabTitle} title={defaultTabTitle}>
                  <CoinsList
                    displayDetailsOnClick={true}
                    selectedCoins={selectedCoins}
                    setSelectedCoins={setSelectedCoins}
                    setSelectedCoin={setSelectedCoin}
                    showCoinStatus={true}
                  />
                </Tab>
              </Tabs>
            </>
          )}
        </div>
      ) : (
        <>
          <Tabs defaultActiveKey={defaultTabTitle}>
            <Tab eventKey={defaultTabTitle} title={defaultTabTitle}>
              <ChannelList />
            </Tab>
            <Tab eventKey={"ACTIVITY"} title={"ACTIVITY"}>
              {/* <EmptyCoinDisplay /> */}
              {/* <CoinsList
                        displayDetailsOnClick={true}
                        selectedCoins={selectedCoins}
                        setSelectedCoins={setSelectedCoins}
                        setSelectedCoin={setSelectedCoin}
                        showCoinStatus={true}
                        /> */}
            </Tab>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default PanelCoinsActivity;
