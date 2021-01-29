import arrow from '../../images/arrow-accordion.png';

import { callGetFeeInfo } from '../../features/WalletDataSlice'

import React, {useState, useEffect} from "react";
import { useSelector, useDispatch } from 'react-redux'

import './panelConnectivity.css';
import '../index.css';


const PanelConnectivity = (props) => {
  // Arrow down state
  const [state, setState] = useState({isToggleOn: false});
  const toggleContent = (event) => {setState({isToggleOn: !state.isToggleOn})}

  // Fee info state
  const [stateFeeInfo, setStateFeeInfo] = useState({deposit: "NA", withdraw: "NA"});
  const dispatch = useDispatch();
  const fee_info_promise = useSelector(state => state.walletData).fee_info;
  const config = useSelector(state => state.walletData).config;

  // Check if fee info is present and store in state
  const checkFeeInfo = () => {
    fee_info_promise.then((fee_info) => {
      fee_info.endpoint = config.endpoint
      setStateFeeInfo(fee_info)
    })
  }
  checkFeeInfo()

  return (
      <div className="Body small accordion">
          <div className="Collapse">
              <div className="ConnectionStateChain">
                  <label>
                      <input
                          type="radio"
                          value="StateChain"
                          checked={stateFeeInfo !== "NA"}
                      />
                      Connected to Server
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div className="ConnectionSwaps">
                  <label>
                      <input
                          type="radio"
                          value="Swaps"
                          checked={false}
                      />
                      Connected to Swaps
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div onClick={toggleContent} className={state.isToggleOn ? "image rotate"  : ' image '} >
                  <img src={arrow} alt="arrowIcon"/>
              </div>
          </div>

          <div className={state.isToggleOn ? "show" : ' hide'}>
              <div className="collapse-content">
                  <div className="collapse-content-item">
                      <span>{stateFeeInfo.endpoint}</span>
                      <div>
                          <span className="txt">Deposit Fee: <b>{stateFeeInfo.deposit /10000}%</b></span>
                          <span className="txt">Withdraw Fee: <b>{stateFeeInfo.withdraw/10000}%</b></span>
                      </div>
                  </div>

                  <div className="collapse-content-item">
                      <span>xxx.xxx.x.xx</span>
                      <div>
                          <span className="txt">Pending Swaps: <b>NA</b></span>
                          <span className="txt">Participants: <b>NA</b></span>
                          <span className="txt">Total pooled BTC: <b>NA</b></span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}

export default PanelConnectivity;
