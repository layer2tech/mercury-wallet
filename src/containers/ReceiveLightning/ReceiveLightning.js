'use strict';
import arrow from "../../images/arrow-up.png";
import { withRouter, Redirect} from "react-router-dom";


import {isWalletLoaded,
  callGetConfig,
  createInvoice
} from '../../features/WalletDataSlice';

import { AddressInput, Tutorial } from "../../components";


import PageHeader from '../PageHeader/PageHeader';
import { useState } from "react";

import "./ReceiveLightning.css";
import Invoice from "../Invoice/Invoice";

const ReceiveLightning = () => {

    // Time for expiry of invoice in seconds
    const TimeToExpire = 180;

    const [inputAmt, setInputAmt] = useState("");

    const [inputDes, setInputDes] = useState("");

    const [invoice, setInvoice] = useState({});

    const [countdown, setCountdown] = useState(TimeToExpire);
    const [timer, setTimer] = useState(null);

    const onInputAmtChange = (event) => {
      setInputAmt(event.target.value);
    };

    const onInputDesChange = (event) => {
      setInputDes(event.target.value);
    };

    const startTimer = () => {
      setTimer(
        setInterval(() => {
          setCountdown((countdown) => {
            if (countdown === 0) {
              stopTimer();
              setInvoice({});
              return countdown;
            }
            return countdown - 1;
          });
        }, 1000)
      );
    };

    const stopTimer = () => {
        clearInterval(timer);
    }

    const createInvoice = () => {
      let newInvoice = { amt: inputAmt, desc: inputDes, addr: "lnbc1p3c7e50pp5c2mz09dcevs88rvgd80rvy9vtuj27xnu0wv3eg8mczv6s4z9udvqdq5g9kxy7fqd9h8vmmfvdjscqzpgxqyz5vqsp59tpw68mrseaxc503nq0y44aqydl2xvcm5smmdwwkdvaf6jvqvvvq9qyyssqw73td8f5nz6j799y6vvne02yek8a3mt8kryheuwqc4y69t3yf9e478f5z4r0s3pswkkevdlcjfhrtrycpvlcaqzzrew7aqgq34lrk3qps6l35u" };
      setInvoice(newInvoice);
      setInputAmt("");
      setInputDes("");
      stopTimer();
      setCountdown(TimeToExpire);
      startTimer();
    }

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
            title = "Receive lightning"
            className = "receive-channel"
            icon = {arrow}
            subTitle = "Y BTC available over Z channels" />
            {invoice && Object.keys(invoice).length ? 
              <Invoice
                amt={invoice.amt}
                desc={invoice.desc}
                addr={invoice.addr}
                expTime={countdown}
              /> : null
            }

          <div className="withdraw content lightning">
              <div className="Body right lightning">
                  <div className="header">
                      <h3 className="subtitle">Invoice Details</h3>
                  </div>


                  <div>
                      <AddressInput
                        inputAddr={inputAmt}
                        onChange={onInputAmtChange}
                        placeholder='Enter amount'
                        smallTxtMsg='Amount Sats'/>
                  </div>
                  <div>
                      <AddressInput
                        inputAddr={inputDes}
                        onChange={onInputDesChange}
                        placeholder='Description'
                        smallTxtMsg='Description'/>
                  </div>

                  <div>
                    <button type="button" className={`btn withdraw-button `} onClick={createInvoice}>
                        Create Invoice </button>
                  </div>
              </div>
          </div>
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}


export default withRouter(ReceiveLightning);
