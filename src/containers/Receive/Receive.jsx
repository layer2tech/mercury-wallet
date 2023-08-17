"use strict";
import { useEffect, useState } from "react";
import { withRouter, Redirect } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { AddressInput, CopiedButton } from "../../components";
import QRCode from "qrcode.react";

import {
  isWalletLoaded,
  callNewSeAddr,
  callGetSeAddr,
  callGetNumSeAddr,
  callTransferReceiver,
  callGetTransfers,
  setError,
  setNotification,
  callPingElectrumRestart,
  addCoins,
} from "../../features/WalletDataSlice";
import { fromSatoshi } from "../../wallet";

import Loading from "../../components/Loading/Loading";

import arrow from "../../images/arrow-up.png";
import icon2 from "../../images/icon2.png";
import closeIcon from "../../images/close-icon.png";
import info from "../../images/info.png";

import "./Receive.css";
import "../Send/Send.css";

import { Transaction } from "bitcoinjs-lib";
import MultipleReceive from "../MultipleReceive/MultipleReceive";
import { setIntervalIfOnline } from "../../features/WalletDataSlice";
import WrappedLogger from "../../WrappedLogger";
import PageHeader from "../PageHeader/PageHeader";

let addr_index = -2;

export const resetIndex = () => {
  addr_index = -2;
};

// Logger import.
// Node friendly importing required for Jest tests.
let log;
log = new WrappedLogger();

const ReceiveStatecoinPage = () => {
  const dispatch = useDispatch();

  const [transfer_msg3, setTransferMsg3] = useState("");
  const [openTransferKey, setOpenTransferKey] = useState(false);
  const [electrumServer, setElectrumServer] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferKeyLoading, setTransferKeyLoading] = useState(false);
  const [receiveMultiple, setReceiveMultiple] = useState(false);
  const [receive, setReceive] = useState(false);

  const [numReceive, setNumReceive] = useState(1);

  const torInfo = useSelector((state) => state.walletData).torInfo;

  const onTransferMsg3Change = (event) => {
    setTransferMsg3(event.target.value);
  };

  let num_addresses = callGetNumSeAddr();

  if (addr_index === -2 || (addr_index === -1 && !receiveMultiple)) {
    addr_index = num_addresses - 1;
  }

  const [rec_sce_addr, setRecAddr] = useState(callGetSeAddr(addr_index));

  useEffect(() => {
    let isMounted = true;
    // Check if Electrum server connected on page open
    checkElectrum(isMounted);
    const interval = setIntervalIfOnline(
      (bmounted) => {
        if (bmounted === true) {
          checkElectrum(bmounted);
        }
      },
      torInfo.online,
      10000,
      isMounted
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (receive) {
      receiveButtonAction();
      setReceive(false);
    }
  }, [numReceive, receive]);

  const checkElectrum = (isMounted) => {
    callPingElectrumRestart(!torInfo.online)
      .then((res) => {
        if (isMounted === true) {
          if (res.height) {
            setElectrumServer(true);
          }
        }
      })
      .catch((err) => {
        log.warn(JSON.stringify(err));
        if (isMounted === true) {
          setElectrumServer(false);
        }
      });
  };

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const genAddrButtonAction = () => {
    callNewSeAddr();
    num_addresses = callGetNumSeAddr();
    setRecAddr(callGetSeAddr(num_addresses - 1));
    addr_index = num_addresses - 1;
  };

  const prevAddrButtonAction = async () => {
    if (addr_index < 0) {
      addr_index = -1;
    } else {
      addr_index--;
    }

    if (addr_index > -1) {
      setReceiveMultiple(false);
      setRecAddr(callGetSeAddr(addr_index));
    } else {
      setReceiveMultiple(true);
    }
  };

  const nextAddrButtonAction = async () => {
    if (addr_index >= num_addresses - 1) {
      addr_index = num_addresses - 1;
    } else {
      addr_index++;
    }

    if (addr_index > -1) {
      setReceiveMultiple(false);
      setRecAddr(callGetSeAddr(addr_index));
    }
  };

  const receiveButtonAction = () => {
    // if transfer key box empty, then query server for transfer messages
    if (electrumServer) {
      setTransferLoading(true);
      dispatch(
        callGetTransfers({ addr_index: addr_index, numReceive: numReceive })
      ).then((res) => {
        let [nreceived, error] = res.payload.split("../..");
        // Set Number of received statecoins and error
        if (nreceived === 0) {
          dispatch(setError({ msg: "No transfers to receive." }));
        } else {
          dispatch(
            setNotification({ msg: `Received ${nreceived} statecoins.` })
          );
          dispatch(addCoins(nreceived));
          if (!rec_sce_addr.used) setRecAddr(callGetSeAddr(addr_index));
        }
        if (error !== "") {
          dispatch(setError({ msg: `Error receiving statecoins: ${error}` }));
        }
        setTransferLoading(false);
      });
      return;
    } else {
      dispatch(setError({ msg: "The Electrum network connection is lost" }));
    }
  };

  const receiveWithKey = () => {
    // Receive with transfer key
    setTransferKeyLoading(true);
    dispatch(callTransferReceiver(transfer_msg3)).then((res) => {
      if (res.error === undefined) {
        setTransferMsg3("");
        let amount = res.payload.state_chain_data.amount;
        let locktime = Transaction.fromHex(
          res.payload.tx_backup_psm.tx_hex
        ).locktime;
        dispatch(
          setNotification({
            msg:
              "Transfer of " +
              fromSatoshi(amount) +
              " BTC complete! StateCoin expires at block height " +
              locktime +
              ".",
          })
        );
        dispatch(addCoins(1));
        if (!rec_sce_addr.used) setRecAddr(callGetSeAddr(addr_index));
      }
      setTransferKeyLoading(false);
    });
  };

  const handleOpenTransferKey = () => {
    if (electrumServer) {
      setOpenTransferKey(!openTransferKey);
    } else {
      dispatch(setError({ msg: `The Electrum network connection is lost` }));
    }
  };

  const copySEAddressToClipboard = (e) => {
    navigator.clipboard.writeText(rec_sce_addr.sce_address);
  };

  const tooltipHover = (e) => {
    var tooltipSpan = document.querySelector(
      ".receiveStatecoin-scan-txid span.tooltip"
    );
    if (tooltipSpan !== null) {
      var w = window.innerWidth;
      var h = window.innerHeight;

      var x = e.clientX;
      var y = e.clientY;

      tooltipSpan.style.top = `${y + 16}px`;

      if (x >= w - 370) {
        tooltipSpan.style.left = `${w - 370 + 72}px`;
      } else {
        tooltipSpan.style.left = `${x + 72}px`;
      }

      if (x >= w - 120 && tooltipSpan.classList.contains("available")) {
        tooltipSpan.style.left = `${w - 120 + 72}px`;
      } else {
        tooltipSpan.style.left = `${x + 72}px`;
      }
    }
  };

  const usedMessage = (coin_status) => {
    if (coin_status === "SWAPPED") return "Swap";
    if (coin_status === "AWAITING_SWAP") return "Awaiting Swap";
    if (coin_status == "INITIALISED") return "Initialised Coin";
    else return "Transfer";
  };

  const handleClose = () => {
    addr_index++;
    setReceiveMultiple(false);
  };

  return (

    <div className="container ">
      <PageHeader 
        title = "Receive Statecoins"
        className = "receiveStatecoin"
        icon = {arrow}
        subTitle = "Use the address below to receive statecoins"/>

      <div className="receiveStatecoin content">
        <div className="Body">
          <div className="body-title">
            <span className="title">
              <p className="receive-note">Statecoin Address</p>
            </span>
            <span className="arrows">
              <div className="prev-next">
                <button
                  type="button"
                  className="Body-button transparent left"
                  onClick={prevAddrButtonAction}
                >
                  <img src={arrow} alt="arrow" />
                </button>
                <button
                  type="button"
                  className="Body-button transparent right"
                  onClick={nextAddrButtonAction}
                >
                  <img src={arrow} alt="arrow" />
                </button>
              </div>
            </span>
          </div>
          <MultipleReceive
            show={receiveMultiple}
            handleClose={handleClose}
            setNumReceive={setNumReceive}
            receiveButtonAction={receiveButtonAction}
            setReceive={setReceive}
          />
          <div className="receiveStatecoin-scan">
            <div className="receive-qr-code">
              {rec_sce_addr.sce_address ? (
                <QRCode value={rec_sce_addr.sce_address} />
              ) : null}
            </div>
            <div className="receiveStatecoin-scan-content">
              <div
                className="receiveStatecoin-scan-txid"
                onMouseMove={(e) => tooltipHover(e)}
              >
                <CopiedButton
                  handleCopy={copySEAddressToClipboard}
                  style={{
                    bottom: "-30px",
                    top: "initial",
                    backgroundColor: "var(--button-border)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: "var(--text-primary)",
                    fontWeight: "bold",
                  }}
                  message="Copied to Clipboard"
                  className={
                    rec_sce_addr.used === true
                      ? `copy-btn-wrap used`
                      : "copy-btn-wrap"
                  }
                >
                  <div className="address-index">
                    <div data-testid="Receive address" className="address">
                      <img type="button" src={icon2} alt="icon" />
                      <span className="rec-address">
                        {rec_sce_addr.sce_address}
                      </span>
                    </div>
                    <div className="info-receive">
                      <div className="info-container">
                        <img src={info} alt="info" />
                        <span className="tooltip-info index">
                          <div>
                            Receive any Statecoins sent to the address listed
                            here
                          </div>
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`Body-button receive-btn btn ${
                          transfer_msg3 ? "active" : ""
                        }`}
                        onClick={
                          (transferLoading || transferKeyLoading) === false
                            ? receiveButtonAction
                            : (e) => {
                                e.stopPropagation();
                              }
                        }
                      >
                        {transferLoading ? (
                          <Loading />
                        ) : (
                          `RECEIVE Index: ${addr_index > -1 ? addr_index : 0}`
                        )}
                      </button>
                    </div>
                  </div>
                </CopiedButton>
                {rec_sce_addr.used === true ? (
                  <span className="tooltip">
                    <div>
                      <b>Privacy Warning!</b>
                    </div>
                    <div>
                      <b>Last Used: </b> {usedMessage(rec_sce_addr.coin_status)}
                    </div>
                    <div>
                      Address used <b>{rec_sce_addr.count}</b> time(s)
                    </div>
                  </span>
                ) : (
                  <span className="tooltip available">
                    <div>
                      <b>Available</b>
                    </div>
                  </span>
                )}
              </div>
              <div className="btns-container">
                <button
                  label="Generate address"
                  type="button"
                  className="Body-button transparent"
                  onClick={genAddrButtonAction}
                >
                  GENERATE ADDRESS
                </button>
                <div className="receive-btns">
                  <div className="info-container">
                    <span className="tooltip-info index">
                      <div>
                        Receive Statecoins with unique key given by the transfer
                        sender after transaction confirmation (mm1...)
                      </div>
                    </span>
                    <img src={info} alt="info" className="info-img" />
                  </div>
                  <button
                    type="button"
                    className={`Body-button receive-btn btn ${
                      transfer_msg3 ? "active" : ""
                    }`}
                    onClick={
                      (transferLoading || transferKeyLoading) === false
                        ? handleOpenTransferKey
                        : null
                    }
                  >
                    {transferKeyLoading ? <Loading /> : "RECEIVE WITH KEY"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openTransferKey === true ? (
        <div className="receiveStatecoin sendStatecoin content">
          <div className="overlay" onClick={handleOpenTransferKey}></div>
          <div className="Body center">
            <button
              className="primary-btm ghost"
              onClick={handleOpenTransferKey}
            >
              <img src={closeIcon} alt="close-button" />
            </button>
            <p className="receive-note">Transfer Key:</p>
            <div className="receive-bottom">
              <AddressInput
                inputAddr={transfer_msg3}
                onChange={onTransferMsg3Change}
                placeholder="mm1..."
                smallTxtMsg="Transfer Code"
              />
              <button
                type="button"
                className={`btn ${transfer_msg3 ? "active" : ""}`}
                onClick={
                  (transferLoading || transferKeyLoading) === false
                    ? receiveWithKey
                    : null
                }
              >
                {transferKeyLoading ? <Loading /> : "RECEIVE"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default withRouter(ReceiveStatecoinPage);
