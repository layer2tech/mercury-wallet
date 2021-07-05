import arrow from '../../images/arrow-accordion.png';

import React, {useState, useEffect} from "react";
import {useSelector} from 'react-redux'

import {callGetBlockHeight, callGetConfig, callGetSwapGroupInfo} from '../../features/WalletDataSlice'
import {defaultWalletConfig} from '../../containers/Settings/Settings'

import './panelConnectivity.css';
import '../index.css';


const PanelConnectivity = (props) => {
  // Arrow down state and url hover state
  const [state, setState] = useState({isToggleOn: false,
    isServerHover:false, isSwapsHover:false});

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

  const fee_info = useSelector(state => state.walletData).fee_info;
  const [block_height, setBlockHeight] = useState(callGetBlockHeight());
  const swap_groups_data = callGetSwapGroupInfo();
  let swap_groups_array = swap_groups_data ? Array.from(swap_groups_data.entries()) : new Array();
  let pending_swaps = swap_groups_array.length;
  let participants = swap_groups_array.reduce((acc, item) => acc+item[1],0);
  let total_pooled_btc = swap_groups_array.reduce((acc, item) => acc+(item[1] * item[0].amount),0);

  // every 5s check if block_height changed and set a new value
  useEffect(() => {
      const interval = setInterval(() => {
          if(block_height !== callGetBlockHeight()){
            setBlockHeight(callGetBlockHeight());
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [block_height]);

  useEffect(() => {
    //Displaying connecting spinners
    let connection_pending = document.getElementsByClassName("checkmark")

    //Add spinner for loading connection to Server
    fee_info.deposit !== "NA" ? (connection_pending[0].classList.add("connected")):(connection_pending[0].classList.remove("connected"))

    //Add spinner for loading connection to Swaps
    if(swap_groups_array.length){
        connection_pending[1].classList.add("connected")
    }
    else{
        connection_pending[1].classList.remove("connected")
    }
    
    //Add spinner for loading connection to Electrum server
    block_height ? (connection_pending[2].classList.add("connected")):(connection_pending[2].classList.remove("connected")) 
  },[fee_info.deposit,swap_groups_array.length,block_height])

  return (
      <div className="Body small accordion connection-wrap">
          <div className="Collapse">
              <div className="connection-title ConnectionStateChain">
                  <label>
                      <input
                          readOnly
                          type="radio"
                          checked={fee_info.deposit !== "NA"}
                      />
                      {fee_info.deposit !== "NA" ?("Connected"):("Connecting") } to Server
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div className="connection-title ConnectionSwaps">
                  <label>
                      <input
                        readOnly
                        type="radio"
                        checked={swap_groups_array.length}
                      />
                      {swap_groups_array.length ? ("Connected"):("Connecting")} to Swaps
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div className="connection-title ConnectionElectrum">
                  <label>
                      <input
                          readOnly
                          type="radio"
                          checked={block_height}
                      />
                      {block_height?("Connected"):("Connecting") } to Electrum
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div onClick={toggleContent} className={state.isToggleOn ? "image rotate" : ' image '}>
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
                </div>
                <div className="collapse-content-item">
                    <span>Block height: {block_height}</span>
                    <span className="host">Host: {current_config.electrum_config.host}</span>
                    <span>Port: {current_config.electrum_config.port}</span>
                    <span>Protocol: {current_config.electrum_config.protocol}</span>
                </div>
              </div>
          </div>
      </div>
  );
}

export default PanelConnectivity;
