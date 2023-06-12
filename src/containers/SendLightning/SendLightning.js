'use strict';
import arrow from "../../images/arrow-up.png"
import { withRouter, Redirect} from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';


import {isWalletLoaded,
  callGetConfig,
  checkChannelSend,
  getChannels
} from '../../features/WalletDataSlice';

import { AddressInput, Tutorial, ConfirmPopup } from "../../components";


import PageHeader from '../PageHeader/PageHeader';
import { useState } from "react";
import ItemsContainer from "../../components/ItemsContainer/ItemsContainer";

const SendLightning = () => {

    const dispatch = useDispatch();

    const [inputAddr, setInputAddr] = useState("");

    const [loading, setLoading] = useState(false);

    const [channels, setChannels] = useState(getChannels());

    const {balance_info} = useSelector((state) => state.walletData);
    
    const onInputAddrChange = (event) => {
      setInputAddr(event.target.value);
    };
  
    // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
    if (!isWalletLoaded()) {
      return <Redirect to="/" />;
    }

    const sendButtonCheck = async () => {
      // check if channel is chosen
      if (!inputAddr) {
        dispatch(setError({ msg: "Please enter a lightning address to send sats." }))
        return
      }
      // Action for sending sats need to be added here.
    }

  
    let current_config;
    try {
      current_config = callGetConfig();
    } catch(error) {
      console.warn('Can not get config', error)
    }

  return (
    <div className={`${current_config?.tutorials ? 'container-with-tutorials' : ''}`}>

      <div className="container">

          <PageHeader 
            title = "Send lightning"
            className = "send-channel"
            icon = {arrow}
            subTitle = {`${balance_info.channel_balance} Sats available over ${channels.length} channels`} />

          <div className="withdraw content">
              <ItemsContainer 
                channelListProps={{
                  title: "Channel balances"
                }}
                />

              <div className="Body right">
                  <div className="header">
                      <h3 className="subtitle">Transaction Details</h3>
                  </div>

                  <div>
                      <AddressInput
                        inputAddr={inputAddr}
                        onChange={onInputAddrChange}
                        placeholder='Lightning address'
                        smallTxtMsg='Your LN Invoice'/>
                  </div>
              <div/>

              <ConfirmPopup onOk={sendButtonCheck} preCheck={checkChannelSend} argsCheck={[dispatch, inputAddr]} isLightning={true}>
                <button type="action-btn-normal" 
                  className = { `btn send-action-button ${loading} `} >
                  {loading ? (<Loading />) : "PAY"}
                </button>
              </ConfirmPopup >
              </div>
          </div>
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}


export default withRouter(SendLightning);
