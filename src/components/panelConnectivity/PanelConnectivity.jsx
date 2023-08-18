"use strict";
import arrow from "../../assets/images/arrow-accordion.png";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

import {
  callGetBlockHeight,
  callGetConfig,
  callGetSwapGroupInfo,
  setIntervalIfOnline,
  WALLET_MODE,
  UpdateSpeedInfo,
  callGetLatestBlock,
  setBlockHeightLoad,
  setError,
  getNetworkType,
  setNetworkType
} from "../../features/WalletDataSlice";

import "./PanelConnectivity.css";
import "../index.css";
import RadioButton from "./RadioButton";
import WrappedLogger from "../../WrappedLogger";
import DropdownArrow from "../DropdownArrow/DropdownArrow";
import { defaultWalletConfig } from "../../wallet/config";
import { NETWORK_TYPE } from "../../wallet/wallet";
import { LIGHTNING_URL } from "../../wallet/ldk_client";


// Logger import.
// Node friendly importing required for Jest tests.
let log;
log = new WrappedLogger();

const PanelConnectivity = (props) => {
  const dispatch = useDispatch();

  const { walletMode, fee_info, torInfo, ping_conductor_ms, ping_server_ms, ping_electrum_ms, ping_lightning_ms, blockHeightLoad } = useSelector((state) => state.walletData)

  // Arrow down state and url hover state
  const [state, setState] = useState({
    isToggleOn: false,
    isServerHover: false,
    isSwapsHover: false,
    isBTCHover: false,
  });

  const [block_height, setBlockHeight] = useState(callGetBlockHeight());

  const [server_connected, setServerConnected] = useState(ping_server_ms ? true : false);
  const [conductor_connected, setConductorConnected] = useState(ping_conductor_ms ? true : false);
  const [electrum_connected, setElectrumConnected] = useState((ping_electrum_ms && block_height) ? true : false);
  const [lightning_connected, setLightningConnected] = useState(ping_lightning_ms ? true : false);

  const swap_groups_data = callGetSwapGroupInfo();
  let swap_groups_array = swap_groups_data
    ? Array.from(swap_groups_data.entries())
    : [];
  let pending_swaps = swap_groups_array.length;

  let participants = swap_groups_array.reduce(
    (acc, item) => acc + item[1].number,
    0
  );
  let total_pooled_btc = swap_groups_array.reduce(
    (acc, item) => acc + item[1].number * item[0].amount,
    0
  );

  const lightning_url = new URL(LIGHTNING_URL); 

  let config;
  try {
    config = callGetConfig();
  } catch {
    defaultWalletConfig().then((result) => {
      config = result;
    });
  }


  useEffect(() => {
    if( walletMode === WALLET_MODE.STATECHAIN){
      setServerConnected(false);
      setConductorConnected(false);
      setElectrumConnected(false);
      // setBlockHeight(null);
    }
  }, [props.networkType]);

  const updateSpeedInfo = async (isMounted) => {
    if (isMounted !== true) {
      return;
    }
    await UpdateSpeedInfo(dispatch, torInfo.online, ping_server_ms, ping_electrum_ms, ping_conductor_ms
      ,setServerConnected, setConductorConnected, setElectrumConnected, block_height);
  };

  useEffect(() => {
    updateSpeedInfo(true)
  }, [])
  
  
  useEffect(() => {
    let isMounted = true;
    let interval = setIntervalIfOnline(
      updateSpeedInfo,
      torInfo.online,
      10000,
      isMounted
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [torInfo.online]);

  // useEffect(() => {
  //   // PLACEHOLDER :- CLOSE TAB WITH DATA INFO

  //   if(state.isToggleOn && (walletMode === WALLET_MODE.LIGHTNING)){
  //     setState({isToggleOn: false})
  //   }
  // }, [state.isToggleOn, walletMode])

  // every 500ms check if block_height changed and set a new value
  useEffect(() => {
    let isMounted = true;
    let interval = setIntervalIfOnline(
      getBlockHeight,
      torInfo.online,
      5000,
      isMounted
    );

    return () => {
      isMounted = false;
      //if (interval != null) {
      clearInterval(interval);
      //}
    };
  }, [block_height, torInfo.online, props.online]);

  useEffect(() => {
    if( walletMode === WALLET_MODE.STATECHAIN ){

      if (fee_info?.deposit != "NA") {
        setServerConnected(true);
      } else {
        setServerConnected(false)
      }
  
      //Add spinner for loading connection to Swaps

      if (swap_groups_array?.length != null && swap_groups_array?.length != 0) {
        setConductorConnected(true);
      }
      //Add spinner for loading connection to Electrum server
      if (block_height != null && block_height > 0) {
        setElectrumConnected(true);
      }
    }
    if (ping_lightning_ms === null) {
      setLightningConnected(false);
    } else {
      setLightningConnected(true);
    }
  }, [
    fee_info.deposit,
    swap_groups_array.length,
    block_height,
    ping_server_ms,
    ping_conductor_ms,
    ping_electrum_ms,
    ping_lightning_ms
  ]);


  useEffect(() => {
    const warningTimeout = setTimeout(() => getWarning(), 60000);
    return () => clearTimeout(warningTimeout);
  }, []);

  const getWarning = () => {
    let block_height = callGetBlockHeight();
    if ((block_height === null || block_height === 0) && getNetworkType() === NETWORK_TYPE.I2P) {
      dispatch(
        setError({ msg: "Warning: I2PD failed to start. Reverting to Tor" })
      );
      setNetworkType(NETWORK_TYPE.TOR);
    }
  }

  const getBlockHeight = async () => {
    if (torInfo.online !== true) {
      // set blockheight to null if app offline
      setBlockHeight(null)
      return;
    } else{
      if( block_height === null || block_height === 0 ){
        // call to electrum server to set wallet var
        let latestBlock = await callGetLatestBlock();

        if(latestBlock !== 0 || latestBlock !== null ){
          // triggers refresh when blockheight loaded to wallet object
          dispatch(setBlockHeightLoad(!blockHeightLoad));
        }
        setBlockHeight(latestBlock);
      }
    }
    // set blockheight with wallet variable
    setBlockHeight(callGetBlockHeight());
    if(block_height && (block_height !== 0)){
      setElectrumConnected(true);
    }
  };

  //function shortens urls to fit better with styling
  const shortenURLs = (url) => {
    if (url == null) {
      return url;
    }
    let shortURL = "";

    url = url.replace("http://", "");
    shortURL = shortURL.concat(
      url.slice(0, 3),
      "...",
      url.slice(url.length - 8, url.length)
    );

    return shortURL;
  }

  const toggleContent = (event) => {
    setState({ isToggleOn: !state.isToggleOn });
  };
  const toggleURL = (event) => {
    let hostCheck = event.target.classList.value;

    if (hostCheck.includes("server")) {
      setState({ ...state, isServerHover: !state.isServerHover });
    }
    if (hostCheck.includes("swaps")) {
      setState({ ...state, isSwapsHover: !state.isSwapsHover });
    }
    if (hostCheck.includes("btc")) {
      setState({ ...state, isBTCHover: !state.isBTCHover });
    }
  };

  return (
    <div className="Body small accordion connection-wrap">
        {
          walletMode === WALLET_MODE.STATECHAIN ? (

            <div className="Collapse">
              <RadioButton
                connection="Server"
                checked={server_connected}
                condition={ server_connected && ( ping_server_ms === "NA" || ping_server_ms < 10000 ) }
              />
              <RadioButton
                connection="Swaps"
                checked={conductor_connected}
                condition={conductor_connected && ( ping_conductor_ms === "NA" || ping_conductor_ms < 10000 )}
              />
              <RadioButton
                connection="Bitcoin"
                checked={electrum_connected}
                condition={electrum_connected && ( ping_electrum_ms === "NA" || ping_electrum_ms < 10000 )}
              />

              <DropdownArrow 
                isToggleOn = {state.isToggleOn}
                toggleContent = {toggleContent} />   

            </div>

          ) : (
            <div className="Collapse">
              <RadioButton
                connection="Lightning server"
                checked={lightning_connected}
                condition={lightning_connected && ( ping_lightning_ms === "NA" || ping_lightning_ms < 10000 )}
              />

              <RadioButton
                connection="Bitcoin"
                checked={electrum_connected}
                condition={electrum_connected && ( ping_electrum_ms === "NA" || ping_electrum_ms < 10000 )}
              />

              <DropdownArrow 
                isToggleOn = {state.isToggleOn}
                toggleContent = {toggleContent} />   

            </div>
          )
        }

      <div className={state.isToggleOn ? "show" : " hide"}>
      {
          walletMode === WALLET_MODE.STATECHAIN ? (

          <div className="collapse-content">
            <div className="collapse-content-item">
              <span
                className="host server"
                onMouseEnter={toggleURL}
                onMouseLeave={toggleURL}
              >
                Host:
                {state.isServerHover ? (
                  <span
                    className={
                      state.isServerHover ? "url-hover server" : "url-hide server"
                    }
                  >
                    {config.state_entity_endpoint}
                  </span>
                ) : (
                  ` ${shortenURLs(config.state_entity_endpoint)}`
                )}
              </span>
              <span>
                Deposit Fee: <b>{fee_info.deposit / 100}%</b>
              </span>
              <span>
                Withdraw Fee: <b>{fee_info.withdraw / 100}%</b>
              </span>
              <span>
                Ping:{" "}
                <b>
                  {ping_server_ms !== null
                    ? `${Math.round(ping_server_ms)} ms`
                    : "N/A"}{" "}
                </b>
              </span>
              <span>{fee_info.endpoint}</span>
            </div>
            <div className="collapse-content-item">
              <span
                className="host swaps"
                onMouseEnter={toggleURL}
                onMouseLeave={toggleURL}
              >
                Host:
                {state.isSwapsHover ? (
                  <span
                    className={
                      state.isSwapsHover ? "url-hover swaps" : "url-hide swaps"
                    }
                  >
                    {config.swap_conductor_endpoint}
                  </span>
                ) : (
                  ` ${shortenURLs(config.swap_conductor_endpoint)}`
                )}
              </span>
              <span>
                Pending Swaps: <b>{pending_swaps}</b>
              </span>
              <span>
                Participants: <b>{participants}</b>
              </span>
              <span>
                Total pooled BTC: <b>{total_pooled_btc / Math.pow(10, 8)}</b>
              </span>
              <span>
                Ping:{" "}
                <b>
                  {ping_conductor_ms !== null
                    ? `${Math.round(ping_conductor_ms)} ms`
                    : "N/A"}{" "}
                </b>
              </span>
            </div>
            <div className="collapse-content-item">
              <span>Block height: {block_height}</span>
              <span
                className="host btc"
                onMouseEnter={toggleURL}
                onMouseLeave={toggleURL}
              >
                Host:
                {state.isBTCHover ? (
                  <span
                    className={
                      state.isBTCHover ? "url-hover btc" : "url-hide btc"
                    }
                  >
                    {config?.electrum_config?.host}
                  </span>
                ) : (
                  `${shortenURLs(config?.electrum_config?.host)}`
                )}
              </span>
              <span>Port: {config?.electrum_config?.port}</span>
              <span>Protocol: {config?.electrum_config?.protocol}</span>
              <span>
                Ping:{" "}
                <b>
                  {ping_electrum_ms !== null
                    ? `${Math.round(ping_electrum_ms)} ms`
                    : "N/A"}{" "}
                </b>
              </span>
            </div>
          </div>

        ) : (
          <div className="collapse-content">
            <div className="collapse-content-item">
              <span
                className="host btc"
                onMouseEnter={toggleURL}
                onMouseLeave={toggleURL}
              >
                Host:
                {state.isBTCHover ? (
                  <span
                    className={
                      state.isBTCHover ? "url-hover btc" : "url-hide btc"
                    }
                  >
                    {lightning_url?.hostname}
                  </span>
                ) : (
                  `${shortenURLs(lightning_url?.hostname)}`
                )}
              </span>
              <span>Port: {lightning_url?.port}</span>
              <span>Protocol: {lightning_url?.protocol.replace(":", "")}</span>
              <span>
                Ping:{" "}
                <b>
                  {ping_lightning_ms !== null
                    ? `${Math.round(ping_lightning_ms)} ms`
                    : "N/A"}{" "}
                </b>
              </span>
              <span>{fee_info.endpoint}</span>
            </div>
            <div className="collapse-content-item">
              <span>Block height: {block_height}</span>
              <span
                className="host btc"
                onMouseEnter={toggleURL}
                onMouseLeave={toggleURL}
              >
                Host:
                {state.isBTCHover ? (
                  <span
                    className={
                      state.isBTCHover ? "url-hover btc" : "url-hide btc"
                    }
                  >
                    {config?.electrum_config?.host}
                  </span>
                ) : (
                  `${shortenURLs(config?.electrum_config?.host)}`
                )}
              </span>
              <span>Port: {config?.electrum_config?.port}</span>
              <span>Protocol: {config?.electrum_config?.protocol}</span>
              <span>
                Ping:{" "}
                <b>
                  {ping_electrum_ms !== null
                    ? `${Math.round(ping_electrum_ms)} ms`
                    : "N/A"}{" "}
                </b>
              </span>
            </div>
          </div>
        )
      }
      </div>
    </div>
  );
};

export default PanelConnectivity;
