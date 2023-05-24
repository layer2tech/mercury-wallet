import { withRouter, Redirect } from "react-router-dom";
import PageHeader from "../PageHeader/PageHeader";
import { useState, useEffect } from "react";
import plus from "../../images/plus-deposit.png";
import btc_img from "../../images/icon1.png";
import arrow_img from "../../images/scan-arrow.png";
import copy_img from "../../images/icon2.png";
import {
  CopiedButton,
  AddressInput,
  CheckBox,
  ConfirmPopup,
} from "../../components";
import { fromSatoshi } from "../../wallet";
import check from "../../images/icon-action-check_circle.png";
import "../CreateWalletInfo/CreateWalletInfo.css";
import "./DepositLightning.css";

import { checkChannelCreation } from "../../features/WalletDataSlice";
import axios from "axios"; // move this to use the http client
import {
  isWalletLoaded,
  getWalletName,
  callCreateChannel,
  setError,
  getChannels,
  callDeleteChannelByAddr,
  callGetNextBtcAddress,
} from "../../features/WalletDataSlice";
import { useDispatch } from "react-redux";
import closeIcon from "../../images/close-icon.png";
import { CHANNEL_STATUS } from "../../wallet/channel";
import InvoiceOptions from "../../components/InvoiceOptions/InvoiceOptions";

export const CHANNEL_TYPE = {
  PUBLIC: "Public",
  PRIVATE: "Private",
};

const DepositLightning = (props) => {
  const dispatch = useDispatch();

  const [channels, setChannels] = useState(getChannels());
  const [inputAmt, setInputAmt] = useState("");
  const [inputNodeId, setInputNodeId] = useState("");
  const [pubkey, setPubkey] = useState();

  const [loading, setLoading] = useState(false);
  const [channelType, setChannelType] = useState(CHANNEL_TYPE.PUBLIC);

  const mBTCtoBTC = (mBTC) => {
    return mBTC * 10 ** -3;
  };

  const satsToBTC = (sats) => {
    return sats * 10 ** -8;
  };

  const getRecentInvoice = () => {
    const channel = channels.find(
      (channel) => channel.status === CHANNEL_STATUS.INITIALISED
    );
    let recentInvoice = {};
    if (channel) {
      recentInvoice = {
        amt: satsToBTC(channel.amount),
        addr: channel.funding.addr,
      };
    }
    return recentInvoice;
  };

  const [invoice, setInvoice] = useState(getRecentInvoice());

  const IsChannelAlreadyExist = (pubKey) => {
    return channels.some((channel) => {
      return channel.peer_pubkey === pubKey;
    });
  };

  const createChannel = async () => {
    console.log("[DepositLightning.js]: Create a channel");

    const pubkey = inputNodeId.substring(0, inputNodeId.indexOf("@"));
    let host = inputNodeId.substring(
      inputNodeId.indexOf("@") + 1,
      inputNodeId.lastIndexOf(":")
    );
    host =
      host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
    const port = inputNodeId.slice(inputNodeId.lastIndexOf(":") + 1);

    if (inputAmt < 1) {
      dispatch(
        setError({
          msg: "The amount you have selected is below the minimum limit 1 SAT. Please increase the amount to proceed with the transaction.",
        })
      );
      return;
    }
<<<<<<< HEAD

    let nextAddress = await callCreateChannel(inputAmt, inputNodeId);
    let newInvoice = {
      amt: satsToBTC(inputAmt),
      addr: nextAddress,
    };
    setInvoice(newInvoice);
    setChannels(getChannels());
    setInvoice(newInvoice);
    setPubkey(pubkey);
=======
>>>>>>> f490442366ecc585a6b2141a7135dc8ccef72632
  };

  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation();
    navigator.clipboard.writeText(address);
  };

  const toggleChannelType = () => {
    setChannelType(
      channelType === CHANNEL_TYPE.PUBLIC
        ? CHANNEL_TYPE.PRIVATE
        : CHANNEL_TYPE.PUBLIC
    );
  };

  const closeInvoice = () => {
    callDeleteChannelByAddr(invoice.addr);
    setInvoice({});
    setChannels(getChannels());
  };

  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container deposit-ln">
      <PageHeader
        title="Create Channel"
        className="create-channel"
        icon={plus}
        subTitle="Deposit SATS in channel"
      />
      {invoice && Object.keys(invoice).length ? (
        <div className="Body" data-cy="invoice">
          <div className="main-coin-wrap">
            <InvoiceOptions />
          </div>
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
                    <CopiedButton
                      handleCopy={(event) =>
                        copyAddressToClipboard(event, invoice.addr)
                      }
                    >
                      <img type="button" src={copy_img} alt="icon" />
                    </CopiedButton>
                    <span className="long">
                      <b>{invoice.addr}</b>
                    </span>
                  </>
                </div>
                <ConfirmPopup onOk={closeInvoice}>
                  <button
                    className={`primary-btm ghost close-invoice ${invoice.addr} ${pubkey}`}
                  >
                    <img src={closeIcon} alt="close-button" />
                  </button>
                </ConfirmPopup>
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

          <div data-cy="amt-input">
            <AddressInput
              inputAddr={inputAmt}
              onChange={(e) => setInputAmt(e.target.value)}
              placeholder="Enter amount (100000=0.001BTC)"
              smallTxtMsg="Amount in SATS"
            />
          </div>
          <div data-cy="nodeid-input">
            <AddressInput
              inputAddr={inputNodeId}
              onChange={(e) => setInputNodeId(e.target.value)}
              placeholder="pubkey@host:port"
              smallTxtMsg="Node Key"
            />
          </div>

          <div data-cy="create-channel">
            <ConfirmPopup
              preCheck={checkChannelCreation}
              argsCheck={[dispatch, inputAmt, inputNodeId]}
              onOk={createChannel}
            >
              <button type="button" className={`btn deposit-button `}>
                {loading ? <Loading /> : "Create Channel"}
              </button>
            </ConfirmPopup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withRouter(DepositLightning);
