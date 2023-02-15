import PageHeader from "../PageHeader/PageHeader";

import { useState } from "react";

import plus from "../../images/plus-deposit.png";
import btc_img from "../../images/icon1.png";
import arrow_img from "../../images/scan-arrow.png";
import copy_img from "../../images/icon2.png";

import { CopiedButton, AddressInput, CheckBox, ConfirmPopup } from "../../components";
import { fromSatoshi } from "../../wallet";
import check from "../../images/icon-action-check_circle.png";
import "../CreateWalletInfo/CreateWalletInfo.css";

import "./DepositLightning.css";

import { checkChannelCreation } from '../../features/WalletDataSlice';
import { useDispatch } from 'react-redux';

// move this to use the http client
import axios from "axios";
import { callCreateChannel, callGetNextBtcAddress, setError } from "../../features/WalletDataSlice";
import { useDispatch } from "react-redux";
import { getWalletName } from "../../features/WalletDataSlice";

export const CHANNEL_TYPE = {
  PUBLIC: "Public",
  PRIVATE: "Private",
};

const DepositLightning = (props) => {
  const dispatch = useDispatch();

  const [inputAmt, setInputAmt] = useState("");

  const [inputNodeId, setInputNodeId] = useState("");

  const [invoice, setInvoice] = useState({});

  const [channelType, setChannelType] = useState(CHANNEL_TYPE.PUBLIC);

  const [loading, setLoading] = useState(false);

  const createChannel = async () => {
    if( inputAmt < 1){
      dispatch(setError({ msg: "The amount you have selected is below the minimum limit ( 1mBTC ). Please increase the amount to proceed with the transaction." }))
      return
    }

    // console.log('PubKey: ', pubkey);
    // console.log('Host: ', host);
    // console.log('Port: ', port);

    // TO DO: PUBLIC KEY AND NODE KEY IN CORRECT FORMAT

    let nextAddress = await callCreateChannel(inputAmt, inputNodeId);

    let newInvoice = {
      amt: mBTCtoBTC(inputAmt),
      addr: nextAddress,
    };

    setInvoice(newInvoice);

  };

  const mBTCtoBTC = (mBTC) => {
    return mBTC * ( 10**-3 );
  }

  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation()
    navigator.clipboard.writeText(address);
  }


  const toggleChannelType = () => {
    setChannelType(
      channelType === CHANNEL_TYPE.PUBLIC
        ? CHANNEL_TYPE.PRIVATE
        : CHANNEL_TYPE.PUBLIC
    );
  };

  return (
    <div className="container deposit-ln">
      <PageHeader
        title="Create Channel"
        className="create-channel"
        icon={plus}
        subTitle="Deposit BTC in channel to a Bitcoin address"
      />
      {invoice && Object.keys(invoice).length ? (
        <div className="Body">
          <div className="deposit-scan">
            <div className="deposit-scan-content">
              <div className="deposit-scan-main">
                <div className="deposit-scan-main-item">
                  <img src={btc_img} alt="icon" />
                  <span>
                    <b>{invoice.amt}</b> BTC
                  </span>
                </div>
                <img src={arrow_img} alt="arrow" />
                <div className="deposit-scan-main-item">
                  <>
                    <CopiedButton handleCopy={(event) => copyAddressToClipboard(event, invoice.addr)} >
                      <img type="button" src={copy_img} alt="icon" />
                    </CopiedButton>
                    <span className="long">
                      <b>{invoice.addr}</b>
                    </span>
                  </>
                </div>
              </div>
            </div>
          </div>
          <span className="deposit-text">
            Create funding transaction by sending {invoice.amt} BTC to the above
            address in a SINGLE transaction
          </span>
        </div>
      ) : null}

      <div className="withdraw content lightning">
        <div className="Body right lightning">
          <div className="header">
            <h3 className="subtitle">Payee Details</h3>
          </div>

          <div>
            <AddressInput
              inputAddr={inputAmt}
              onChange={(e) => setInputAmt(e.target.value)}
              placeholder="Enter amount"
              smallTxtMsg="Amount in mBTC"
            />
          </div>
          <div>
            <AddressInput
              inputAddr={inputNodeId}
              onChange={(e) => setInputNodeId(e.target.value)}
              placeholder="pubkey@host:port"
              smallTxtMsg="Node Key"
            />
          </div>
          <div className="channel-type-toggle">
            <CheckBox
              description=""
              label={channelType === CHANNEL_TYPE.PUBLIC ? "Public" : "Private"}
              checked={channelType === CHANNEL_TYPE.PRIVATE}
              onChange={toggleChannelType}
            />
          </div>

          <div>
          <ConfirmPopup preCheck={checkChannelCreation} argsCheck={[dispatch, inputAmt, inputNodeId]} onOk = {createChannel} >
            <button
                type="button"
                className={`btn deposit-button `}
              >
                {loading?(<Loading/>):("Create Channel")} 
            </button>
          </ConfirmPopup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositLightning;
