import arrow from '../../images/arrow-accordion.png';

import React, {useState, useEffect} from "react";
import {useSelector, useDispatch} from 'react-redux'

import {callGetBlockHeight, callGetConfig, callGetSwapGroupInfo,callGetPingServerms, callGetPingConductorms, callGetPingElectrumms, callUpdateSpeedInfo, setIntervalIfOnline } from '../../features/WalletDataSlice'
import {defaultWalletConfig} from '../../containers/Settings/Settings'

import './panelConnectivity.css';
import '../index.css';
import RadioButton from './RadioButton';

// Logger import.
// Node friendly importing required for Jest tests.
let log;
try {
  log = window.require('electron-log');
} catch (_e) {
  log = require('electron-log');
}

const PanelConnectivity = (props) => {
  const dispatch = useDispatch();
  // Arrow down state and url hover state
  const [state, setState] = useState({isToggleOn: false,
    isServerHover:false, isSwapsHover:false, isBTCHover: false});


  const fee_info = useSelector(state => state.walletData).fee_info;
  const torInfo = useSelector(state => state.walletData).torInfo;
  const [block_height, setBlockHeight] = useState(callGetBlockHeight());
  
  const [server_ping_ms, setServerPingMs] = useState(callGetPingServerms());
  const [conductor_ping_ms, setConductorPingMs] = useState(callGetPingConductorms());
  const [electrum_ping_ms, setElectrumPingMs] = useState(callGetPingElectrumms());

  const swap_groups_data = callGetSwapGroupInfo();
  let swap_groups_array = swap_groups_data ? Array.from(swap_groups_data.entries()) : [];
  let pending_swaps = swap_groups_array.length;

  let participants = swap_groups_array.reduce((acc,item)=> acc+item[1].number,0)
  let total_pooled_btc = swap_groups_array.reduce((acc, item) => acc+(item[1].number * item[0].amount),0);

  const updateSpeedInfo = async () => {
    dispatch(callUpdateSpeedInfo({ torOnline: torInfo.online }));
    if(server_ping_ms !== callGetPingServerms()){
      setServerPingMs(callGetPingServerms())
    }
    if(conductor_ping_ms !== callGetPingConductorms()){
      setConductorPingMs(callGetPingConductorms())
    }
    if(electrum_ping_ms !== callGetPingElectrumms()){
      setElectrumPingMs(callGetPingElectrumms())
    }
  }

  // every 30s check speed
  useEffect(() => {
    updateSpeedInfo()
    const interval = setInterval(() => {
      updateSpeedInfo()
    }, 15000);

    return () => clearInterval(interval);
  }, [server_ping_ms, conductor_ping_ms, electrum_ping_ms, dispatch, torInfo.online]);

  // every 500ms check if block_height changed and set a new value
  useEffect(() => {
    let interval
    setIntervalIfOnline(getBlockHeight, torInfo.online, 5000, interval)

    return () => clearInterval(interval);
  }, [block_height, torInfo.online, props.online]);

  useEffect(() => {
    //Displaying connecting spinners
    let connection_pending = document.getElementsByClassName("checkmark")

    //Add spinner for loading connection to Server
    server_ping_ms !== null  ? (connection_pending[0].classList.add("connected")):(connection_pending[0].classList.remove("connected"))

    //Add spinner for loading connection to Swaps
    if(conductor_ping_ms !== null){
        connection_pending[1].classList.add("connected")
    }
    else{
        connection_pending[1].classList.remove("connected")
    }
    
    //Add spinner for loading connection to Electrum server
    electrum_ping_ms !== null? (connection_pending[2].classList.add("connected")):(connection_pending[2].classList.remove("connected")) 
  },[fee_info.deposit,swap_groups_array.length,block_height, server_ping_ms, conductor_ping_ms, electrum_ping_ms])


  const getBlockHeight = async () => {
    if(torInfo.online !== true){
      // setBlockHeight(null)
      return
    }
    setBlockHeight(callGetBlockHeight());
  }

  //function shortens urls to fit better with styling
  function shortenURLs(url){
    let shortURL = ""
    
    url = url.replace("http://","")
    shortURL = shortURL.concat(url.slice(0,3),"...",url.slice(url.length-8,url.length))
    
    return shortURL
    }

  let current_config;
  try {
    current_config = callGetConfig();
  } catch {
    current_config = defaultWalletConfig()
  }
  

  const toggleContent = (event) => {
    setState({isToggleOn: !state.isToggleOn})
}
const toggleURL = (event) => {
    let hostCheck = event.target.classList.value

    if (hostCheck.includes("server")){
      setState({...state,isServerHover:!state.isServerHover})
    }
    if(hostCheck.includes("swaps")){
      setState({...state,isSwapsHover:!state.isSwapsHover})
    }
    if(hostCheck.includes("btc")){
      setState({...state,isBTCHover:!state.isBTCHover})
    }
}

  return (
        <div className="Body small accordion connection-wrap">
            <div className="Collapse">
            <RadioButton 
                connection = "Server"
                checked = { fee_info.deposit !== "NA" }
                condition = { server_ping_ms !== null }/>
            <RadioButton 
                connection = "Swaps"
                checked = { swap_groups_array.length || conductor_ping_ms }
                condition = { conductor_ping_ms !== null }/>
            <RadioButton 
                connection = "Bitcoin"
                checked = { block_height }
                condition = { electrum_ping_ms !== null }/>

            <div onClick={toggleContent} className={ state.isToggleOn ? "image rotate" : ' image ' }>
                  <img src={arrow} alt="arrowIcon"/>
            </div>
          </div>

        <div className={state.isToggleOn ? "show" : ' hide'}>
            <div className="collapse-content">
                <div className="collapse-content-item">
                    <span className="host server" onMouseEnter={toggleURL}  onMouseLeave={toggleURL}>

                        Host: 
                        {state.isServerHover ? 
                        (<span className ={state.isServerHover ? "url-hover server": "url-hide server"}>{ current_config.state_entity_endpoint}</span>)
                        :
                        (` ${shortenURLs(current_config.state_entity_endpoint)}`)}

                    </span>
                    <span>Deposit Fee: <b>{fee_info.deposit /100}%</b></span>
                    <span>Withdraw Fee: <b>{fee_info.withdraw/100}%</b></span>
                    <span>Ping: <b>{server_ping_ms !== null ? server_ping_ms.toLocaleString(undefined, { maximumFractionDigits:0}) + " ms":"N/A"} </b></span>
                    <span>{fee_info.endpoint}</span>
                </div>
                <div className="collapse-content-item">
                    <span className="host swaps" onMouseEnter={toggleURL} onMouseLeave={toggleURL}>
                        
                        Host: 
                        {state.isSwapsHover ? 
                        (<span className ={state.isSwapsHover ? "url-hover swaps": 'url-hide swaps'}>{ current_config.swap_conductor_endpoint}</span>)
                        :
                        (` ${shortenURLs(current_config.swap_conductor_endpoint)}`)}

                    </span>
                    <span>Pending Swaps: <b>{pending_swaps}</b></span>
                    <span>Participants: <b>{participants}</b></span>
                    <span>Total pooled BTC: <b>{total_pooled_btc / Math.pow(10, 8)}</b></span>
                    <span>Ping: <b>{conductor_ping_ms !== null ? conductor_ping_ms.toLocaleString(undefined, { maximumFractionDigits:0}) + " ms":"N/A"} </b></span>
                </div>
                <div className="collapse-content-item">
                    <span>Block height: {block_height}</span>
                    <span className="host btc" onMouseEnter={toggleURL} onMouseLeave={toggleURL}>
                        Host: 
                        {state.isBTCHover ? 
                        (
                            <span className = {state.isBTCHover ? "url-hover btc" : "url-hide btc"}>
                                {current_config.electrum_config.host}
                            </span>
                        ):(`${shortenURLs(current_config.electrum_config.host)}`)}
                    </span>
                    <span>Port: {current_config.electrum_config.port}</span>
                    <span>Protocol: {current_config.electrum_config.protocol}</span>
                    <span>Ping: <b>{electrum_ping_ms !== null ? electrum_ping_ms.toLocaleString(undefined, { maximumFractionDigits:0}) + " ms":"N/A"} </b></span>
              </div>
              </div>
          </div>
      </div>
  );
}

export default PanelConnectivity;
