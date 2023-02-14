import PageHeader from "../PageHeader/PageHeader";

import { useState } from "react";

import plus from "../../images/plus-deposit.png";
import btc_img from "../../images/icon1.png";
import arrow_img from "../../images/scan-arrow.png";
import copy_img from "../../images/icon2.png";

import { CopiedButton, AddressInput, CheckBox } from "../../components";
import { fromSatoshi } from "../../wallet";
import check from "../../images/icon-action-check_circle.png";
import "../CreateWalletInfo/CreateWalletInfo.css";

import "./DepositLightning.css";

// move this to use the http client
import axios from "axios";
import { callCreateChannel, setError, getChannels } from "../../features/WalletDataSlice";
import { useDispatch } from "react-redux";
import closeIcon from "../../images/close-icon.png";

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

  const [channels, setChannels] = useState(getChannels());

  const IsChannelAlreadyExist = (pubKey) => {
    return channels.some((channel) => {
      return channel.peer_pubkey === pubKey;
    });
  }

  const createChannel = async () => {
    const pubKey = inputNodeId.split('@')[0];

    if (IsChannelAlreadyExist(pubKey)){
      dispatch(setError({ msg: "Channel already exist with given proof key. " }))
      return
    }
    if( inputAmt < 1){
      dispatch(setError({ msg: "The amount you have selected is below the minimum limit ( 1mBTC ). Please increase the amount to proceed with the transaction." }))
      return
    }

    // const [, pubkey, host, port] = inputNodeId.match(
    //   /^([0-9a-f]+)@([^:]+):([0-9]+)$/i
    //   );
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
  
  // const [, pubkey, host, port] = inputNodeId.match(
  //   /^([0-9a-f]+)@([^:]+):([0-9]+)$/i
  // );
  //    axios
  // .post("http://localhost:3003/connectToPeer", {
  //   amount: inputAmt,
  //   channelType,
  //   pubkey,
  //   host,
  //   port,
  // })
  // .then((res) => console.log(res))
  // .catch((err) => console.log(err));

  const toggleChannelType = () => {
    setChannelType(
      channelType === CHANNEL_TYPE.PUBLIC
        ? CHANNEL_TYPE.PRIVATE
        : CHANNEL_TYPE.PUBLIC
    );
  };

  const closeInvoice = () => {
    setInvoice({});
  }

  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation()
    navigator.clipboard.writeText(address);
  }

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
                <button
                  className="primary-btm ghost"
                  onClick={closeInvoice}
                >
                  <img src={closeIcon} alt="close-button" />
                </button>
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
              placeholder="Node Key"
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
            <button
              type="button"
              className={`btn withdraw-button `}
              onClick={createChannel}
            >
              Create Channel{" "}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositLightning;
