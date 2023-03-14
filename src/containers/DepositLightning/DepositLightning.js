import { withRouter, Redirect } from "react-router-dom";
import PageHeader from "../PageHeader/PageHeader";
import { useState } from "react";
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
  callDeleteChannel,
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
  const [invoice, setInvoice] = useState({});
  const [loading, setLoading] = useState(false);
  const [channelType, setChannelType] = useState(CHANNEL_TYPE.PUBLIC);
  
  const mBTCtoBTC = (mBTC) => {
    return mBTC * ( 10**-3 );
  }

  const satsToBTC = (sats) => {
    return sats * ( 10**-8 );
  }

  const getRecentInvoice = () => {
    const channel = channels.find(channel => channel.status === CHANNEL_STATUS.INITIALISED);
    let recentInvoice = {};
    if (channel) {
      recentInvoice = {
        amt: satsToBTC(channel.amount),
        addr: channel.funding.addr,
      };
    }
    return recentInvoice;
  }

  const [invoice, setInvoice] = useState(getRecentInvoice());
  const [channels, setChannels] = useState(getChannels());

  const IsChannelAlreadyExist = (pubKey) => {
    return channels.some((channel) => {
      return channel.peer_pubkey === pubKey;
    });
  };

  const getPubkeyFromAddr = (addr) => {
    const channel = channels.find((channel) => channel.funding.addr === addr);
    return channel.peer_pubkey;
  };

  const createChannel = async () => {
    const pubkey = inputNodeId.split("@")[0];
    const host = inputNodeId.split("@")[1].split(":")[0];
    const port = inputNodeId.split("@")[1].split(":")[1];

    if (inputAmt < 1) {
      dispatch(
        setError({
          msg: "The amount you have selected is below the minimum limit ( 1mBTC ). Please increase the amount to proceed with the transaction.",
        })
      );
      return;
    }

    console.log("checking connection with peer first...");
    // check connection with peer first.
    try {
      const response = await axios.post("http://localhost:3003/connectToPeer", {
        pubkey,
        host,
        port,
      });

      if (response.status === 200) {
        console.log("Successfully connected to peer");

        // if a successful connection can be met then create the channel.
        // TO DO: PUBLIC KEY AND NODE KEY IN CORRECT FORMAT
        let nextAddress = await callCreateChannel(inputAmt, inputNodeId);
        let newInvoice = {
          amt: mBTCtoBTC(inputAmt),
          addr: nextAddress,
        };
        setInvoice(newInvoice);
        setChannels(getChannels());
        setInvoice(newInvoice);
      } else {
        console.log("Failed to connect to peer");
      }
    } catch (error) {
      console.error("Error connecting to peer:", error);
      //throw new Error("Error in channel creation");
      dispatch(setError({ msg: "Error connecting to peer" }));
    }
  };

  const mBTCtoBTC = (mBTC) => {
    return mBTC * 10 ** -3; // TODO: Change back to btc
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
    callDeleteChannel(invoice.addr);
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
        subTitle="Deposit BTC in channel to a Bitcoin address"
      />
      {invoice && Object.keys(invoice).length ? (
        <div className="Body">
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
                    className={`primary-btm ghost close-invoice ${
                      invoice.addr
                    } ${getPubkeyFromAddr(invoice.addr)}`}
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

          <div>
            <AddressInput
              inputAddr={inputAmt}
              onChange={(e) => setInputAmt(e.target.value)}
              placeholder="Enter amount"
              smallTxtMsg="Amount in BTC"
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
