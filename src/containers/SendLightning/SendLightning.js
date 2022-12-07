'use strict';
import arrow from "../../images/arrow-up.png"
import { withRouter, Redirect} from "react-router-dom";
import { useDispatch } from 'react-redux';


import {isWalletLoaded,
  callGetConfig,
  checkChannelSend
} from '../../features/WalletDataSlice';

import { AddressInput, Tutorial, ConfirmPopup } from "../../components";


import PageHeader from '../PageHeader/PageHeader';
import { useState } from "react";
import ChannelList from "../../components/Channels/ChannelList";
import Loading from '../../components/Loading/Loading';

const SendLightning = () => {

    const dispatch = useDispatch();

    const [inputAddr, setInputAddr] = useState("");

    const [forceRender, setRender]  =  useState({});
    const [refreshChannels, setRefreshChannels] = useState(false);

    const [selectedChannels, setSelectedChannels] = useState([]);

    const [loading, setLoading] = useState(false);
    
    const onInputAddrChange = (event) => {
      setInputAddr(event.target.value);
    };

    const addSelectedChannel = (channel_id) => {
      if(loading) return
      // Stop channels removing if clicked while pending transaction
      
      let newSelectedChannels = selectedChannels;
      const isChannelId = (element) => element === channel_id;
      let index = newSelectedChannels.findIndex(isChannelId);
      if (index !== -1){
        newSelectedChannels.splice(index,1);
      } else {
        newSelectedChannels.push(channel_id);
      }
      setSelectedChannels(newSelectedChannels);
      setRender({});
    }
  
    // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
    if (!isWalletLoaded()) {
      return <Redirect to="/" />;
    }

    const sendButtonCheck = async () => {
      // check if channel is chosen
      selectedChannels.forEach(async selectedChannel => {
        if (selectedChannel == null) {
          dispatch(setError({ msg: "Please choose a channel to send." }))
          return
        }
        if (!inputAddr) {
          dispatch(setError({ msg: "Please enter a lightning address to send sats." }))
          return
        }
      })
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
            subTitle = "Y BTC available over Z channels" />

          <div className="withdraw content">
              <div className="Body left ">
                  <div>
                      <h3 className="subtitle">Select channel to send</h3>
                  </div>
                  <ChannelList 
                    selectedChannels={selectedChannels}
                    setSelectedChannel = {addSelectedChannel}
                    refresh = {refreshChannels}
                    render = {forceRender}
                    />

              </div>
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

              <ConfirmPopup onOk={sendButtonCheck} preCheck={checkChannelSend} argsCheck={[dispatch, selectedChannels, inputAddr]} isLightning={true}>
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
