'use strict';
import arrow from "../../images/arrow-up.png"
import { withRouter, Redirect} from "react-router-dom";



import {isWalletLoaded,
  callGetConfig
} from '../../features/WalletDataSlice';

import { AddressInput, Tutorial } from "../../components";


import PageHeader from '../PageHeader/PageHeader';
import { useState } from "react";
import ChannelList from "../../components/Channels/ChannelList";

const SendLightning = () => {

    const [inputAddr, setInputAddr] = useState("");
    
    const onInputAddrChange = (event) => {
      
    };

  
    // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
    if (!isWalletLoaded()) {
      return <Redirect to="/" />;
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
                  <ChannelList />

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
                        smallTxtMsg='Your Bitcoin Address'/>
                  </div>

                  <div>
                    <button type="button" className={`btn withdraw-button `} >
                        Send Lightning </button>
                  </div>
              </div>
          </div>
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}


export default withRouter(SendLightning);