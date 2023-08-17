"use strict";
import { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useSelector } from "react-redux";
import { STATECOIN_STATUS } from "../../wallet/statecoin";
import { Activity, CoinsList } from "..";

import "./PanelCoinsActivity.css";
import "../index.css";
import { getChannels, WALLET_MODE } from "../../features/WalletDataSlice";
import EmptyCoinDisplay from "../coins/EmptyCoinDisplay/EmptyCoinDisplay";
import ChannelList from "../Channels/ChannelList";

const PanelCoinsActivity = (props) => {
  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [selectedChannels, setSelectedChannels] = useState([]);

  const [refreshSwapGroupInfo, setRefreshSwapGroupInfo] = useState(false);

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

  const setSelectedChannel = (channel_id) => {
    setSelectedChannels((prevSelectedChannels) => {
      let newSelectedChannels = [];
      const isStatechainId = (element) => element === channel_id;
      let index = prevSelectedChannels.findIndex(isStatechainId);
      if (index === -1) {
        newSelectedChannels = [channel_id];
      }
      return newSelectedChannels;
    });
  };

  return (
    <div className="table">
      {walletMode === WALLET_MODE.STATECHAIN ? (
        <div className="CoinsPanel">
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
                    refreshSwapGroupInfo={refreshSwapGroupInfo}
                    setRefreshSwapGroupInfo={setRefreshSwapGroupInfo}
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
              <ChannelList
                isMainPage={true}
                channels={getChannels()}
                setSelectedChannels={setSelectedChannels}
                setSelectedChannel={setSelectedChannel}
              />
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
