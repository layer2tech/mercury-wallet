import arrow from '../../images/arrow-accordion.png';

import React, {useState} from "react";
import {useSelector} from 'react-redux'

import {callGetBlockHeight, callGetConfig, callGetSwapGroupInfo} from '../../features/WalletDataSlice'
import {defaultWalletConfig} from '../../containers/Settings/Settings'

import './panelConnectivity.css';
import '../index.css';


const PanelConnectivity = (props) => {
  // Arrow down state
  const [state, setState] = useState({isToggleOn: false});
  const toggleContent = (event) => {
      setState({isToggleOn: !state.isToggleOn})
  }

  let current_config;
  try {
    current_config = callGetConfig();
  } catch {
    current_config = defaultWalletConfig()
  }

  const fee_info = useSelector(state => state.walletData).fee_info;
  const block_height = callGetBlockHeight();
  const swap_groups_data = callGetSwapGroupInfo();
  let swap_groups_array = swap_groups_data ? Array.from(swap_groups_data.entries()) : new Array();
  let pending_swaps = swap_groups_array.length;
  let participants = swap_groups_array.reduce((acc, item) => acc+item[1],0);
  let total_pooled_btc = swap_groups_array.reduce((acc, item) => acc+(item[1] * item[0].amount),0);

  return (
      <div className="Body small accordion">
          <div className="Collapse row">
              <div className="connection-title ConnectionStateChain col-4">
                  <label>
                      <input
                          readOnly
                          type="radio"
                          checked={fee_info.deposit !== "NA"}
                      />
                      Connected to Server
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div className="connection-title ConnectionSwaps col-4">
                  <label>
                      <input
                        readOnly
                        type="radio"
                        checked={swap_groups_array.length}
                      />
                      Connected to Swaps
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div className="connection-title ConnectionElectrum col-4">
                  <label>
                      <input
                          readOnly
                          type="radio"
                          checked={block_height}
                      />
                      Connected to Electrum
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
                    <span>Host: {current_config.state_entity_endpoint}</span>
                    <span>Deposit Fee: <b>{fee_info.deposit /100}%</b></span>
                    <span>Withdraw Fee: <b>{fee_info.withdraw/100}%</b></span>
                    <span>{fee_info.endpoint}</span>
                </div>
                <div className="collapse-content-item">
                    <span>Host: {current_config.swap_conductor_endpoint}</span>
                    <span>Pending Swaps: <b>{pending_swaps}</b></span>
                    <span>Participants: <b>{participants}</b></span>
                    <span>Total pooled BTC: <b>{total_pooled_btc}</b></span>
                </div>
                <div className="collapse-content-item">
                    <span>Block height: {block_height}</span>
                    <span>Host: {current_config.electrum_config.host}</span>
                    <span>Port: {current_config.electrum_config.port}</span>
                    <span>Protocol: {current_config.electrum_config.protocol}</span>
                </div>
              </div>
          </div>
      </div>
  );
}

export default PanelConnectivity;
