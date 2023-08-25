import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { fromSatoshi, STATECOIN_STATUS } from "../../wallet";

import walleticon from "../../assets/images/walletIcon.png";
import statechainIcon from "../../assets/images/statechainIcon.png";
import descripIcon from "../../assets/images/description.png";
import utx from "../../assets/images/utxo_id.png";
import time from "../../assets/images/time_left.png";
import calendar from "../../assets/images/calendar.png";
import swapNumber from "../../assets/images/swap-number.png";
import hashIcon from "../../assets/images/hashtag.png";
import hexIcon from "../../assets/images/hexagon.png";
import icon2 from "../../assets/images/icon2.png";

import "./InfoModal.css";
import SwapStatus from "../Coins/SwapStatus/SwapStatus";
import { SWAP_STATUS_INFO } from "../Coins/CoinsList";
import QRCodeGenerator from "../QRCodeGenerator/QRCodeGenerator";
import CoinStatus from "../CoinStatus/CoinStatus";
import { displayExpiryTime } from "../../features/CoinFunctionUtils/CoinFunctionUtils";
import ProgressBar from "react-bootstrap/ProgressBar";
import Moment from "react-moment";
import CopiedButton from "../CopiedButton/CopiedButton";
import CoinDescription from "../Inputs/CoinDescription/CoinDescription";
import {
  callAddDescription,
  callGetConfig,
  callGetNetwork,
  callGetStateCoin,
  setShowDetailsSeen,
  setWarning,
  setWarningSeen,
} from "../../features/WalletDataSlice";
import { useEffect, useState } from "react";
import isElectron from "is-electron";
import { defaultWalletConfig } from "../../wallet/config";

// style time left timer as red after this many days
export const DAYS_WARNING = 5;

const InfoModal = () => {
  const dispatch = useDispatch();

  const [description, setDescription] = useState("");
  const [dscpnConfirm, setDscrpnConfirm] = useState(false);

  const { showDetails, filterBy } = useSelector((state) => state.walletData);

  let config;

  try {
    config = callGetConfig();
  } catch {
    defaultWalletConfig().then((result) => {
      config = result;
    });
  }

  //Track change to description
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.value.length < 20) {
      setDescription(e.target.value);
    }
  };

  //Confirm description, submit redux state to change Statecoin
  const confirmDescription = () => {
    if (dscpnConfirm === false) {
      callAddDescription(showDetails.coin.shared_key_id, description);
    }
    setDscrpnConfirm(!dscpnConfirm);
  };

  const handleClose = () => {
    dispatch(setShowDetailsSeen());
  };
  const getAddress = (shared_key_id) => {
    let sc = callGetStateCoin(shared_key_id);

    if (sc != undefined) {
      let addr = sc.getBtcAddress(callGetNetwork());
      return addr;
    }
    return null;
  };

  // called when clicking on TXid link in modal window
  const onClickTXID = (txId) => {
    // Opens a warning pop up
    // onClick confirm: function openBlockExplorer(txId) will run
    dispatch(
      setWarning({
        title: "Privacy Warning",
        msg: "This operation will open your browser to access a 3rd party website, (mempool.space) do you wish to continue?",
        onConfirm: openBlockExplorer,
        data: txId,
      })
    );
  };

  const openInNewTab = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openBlockExplorer = (txid) => {
    // Opens txid in block explorer from config default: mempool.space

    let block_explorer_endpoint = config.block_explorer_endpoint;

    // ensure there is https
    if (block_explorer_endpoint.substring(0, 8) !== "https://") {
      block_explorer_endpoint = "https://" + block_explorer_endpoint;
    }

    let finalUrl = block_explorer_endpoint + txid;

    if (isElectron()) {
      // open the browser for both mainnet and testnet
      window.require("electron").shell.openExternal(finalUrl);
    } else {
      openInNewTab(finalUrl);
    }
  };

  const copyToClipboard = (e) => {
    navigator.clipboard.writeText(e.target.parentNode.textContent);
  };

  return (
    <Modal
      show={showDetails.show}
      onHide={handleClose}
      className={
        filterBy === STATECOIN_STATUS.WITHDRAWN ||
        showDetails?.coin?.swap_status !== null
          ? "modal coin-details-modal lower"
          : "modal coin-details-modal"
      }
    >
      <Modal.Body>
        <div>
          <div className="item">
            <img src={walleticon} className="btc-icon" alt="icon" />
            <div className="block">
              <span>Statecoin Value</span>
              <span>
                <b>{fromSatoshi(showDetails.coin.value)} BTC</b>
              </span>
            </div>
          </div>

          {showDetails?.coin?.status &&
            filterBy === "default" &&
            showDetails.coin.status !== STATECOIN_STATUS.AVAILABLE && (
              <div className="item swap-status-container">
                <CoinStatus data={showDetails.coin} isDetails={true} />
                {showDetails.coin.swap_status !== null ? (
                  <SwapStatus
                    swapStatus={
                      SWAP_STATUS_INFO[showDetails.coin.ui_swap_status]
                    }
                  />
                ) : null}
              </div>
            )}
          {showDetails.coin.status === STATECOIN_STATUS.INITIALISED ? (
            <div>
              <div className="item qr-container">
                <div className="block qrcode">
                  <QRCodeGenerator
                    address={getAddress(showDetails.coin.shared_key_id)}
                    amount={fromSatoshi(showDetails.coin.value)}
                  />
                </div>
              </div>
              <div>Deposit amount in a SINGLE transaction</div>
            </div>
          ) : (
            <div>
              <div className="item">
                <img
                  src={statechainIcon}
                  className="sc-address-icon"
                  alt="icon"
                />
                <div className="block">
                  <span>Statecoin Address</span>
                  {showDetails.coin.sc_address != undefined && (
                    <span>{showDetails.coin.sc_address}</span>
                  )}
                </div>
              </div>

              <div className="item">
                <img src={utx} alt="icon" className="utxo" />
                <div className="block">
                  <span>UTXO ID</span>
                  <span>
                    <div className="txhex-container">
                      <CopiedButton handleCopy={(e) => copyToClipboard(e)}>
                        <div className="copy-hex-wrap coin-modal-hex">
                          <img type="button" src={icon2} alt="icon" />
                          <span>
                            {showDetails.coin.funding_txid}:
                            {showDetails.coin.funding_vout}
                          </span>
                        </div>
                      </CopiedButton>
                    </div>
                  </span>
                </div>
              </div>

              <div className="item expiry-time">
                <div className="expiry-time-wrap">
                  <img src={time} alt="icon" className="time" />
                  <div className="block">
                    <span>Time Left Until Expiry</span>
                    <span className="expiry-time-left">
                      {displayExpiryTime(showDetails.coin.expiry_data, true)}
                    </span>
                  </div>
                </div>
                <div
                  className="progress_bar"
                  id={
                    showDetails.coin.expiry_data.days < DAYS_WARNING
                      ? "danger"
                      : "success"
                  }
                >
                  <div className="sub">
                    <ProgressBar>
                      <ProgressBar
                        striped
                        variant={
                          showDetails.coin.expiry_data.days < DAYS_WARNING
                            ? "danger"
                            : "success"
                        }
                        now={(showDetails.coin.expiry_data.days * 100) / 90}
                        key={1}
                      />
                    </ProgressBar>
                  </div>
                </div>
              </div>

              <div className="item">
                <img src={calendar} alt="icon" className="calendar" />
                <div className="block">
                  <span>Date Created</span>

                  <Moment format="MM.DD.YYYY">
                    {showDetails.coin.timestamp}
                  </Moment>
                  <Moment format="h:mm a">{showDetails.coin.timestamp}</Moment>
                </div>
              </div>

              <div className="item">
                <img
                  src={showDetails.coin.privacy_data.icon1}
                  alt="icon"
                  className="privacy"
                />

                <div className="block">
                  <span>Privacy Score</span>
                  <span>{showDetails.coin.privacy_data.score_desc}</span>
                </div>
              </div>
              <div className="item">
                <img src={swapNumber} alt="icon" className="swap" />
                <div className="block">
                  <span>Number of Swaps Rounds</span>
                  <span>
                    Swaps: {showDetails.coin.swap_rounds}
                    {/*
                          <br/>
                          Number of Participants: 0
                        */}
                  </span>
                </div>
              </div>
            </div>
          )}
          {showDetails?.coin?.status &&
          (showDetails.coin.status === STATECOIN_STATUS.WITHDRAWN ||
            showDetails.coin.status === STATECOIN_STATUS.WITHDRAWING) ? (
            <div>
              <div className="item tx_hex">
                <img src={hexIcon} alt="hexagon" className="hex" />
                <div className="block">
                  <span>Transaction Hex</span>
                  <span>
                    <div className="txhex-container">
                      <CopiedButton handleCopy={(e) => copyToClipboard(e)}>
                        <div className="copy-hex-wrap coin-modal-hex">
                          <img type="button" src={icon2} alt="icon" />
                          <span>{showDetails.coin.tx_hex}</span>
                        </div>
                      </CopiedButton>
                    </div>
                  </span>
                </div>
              </div>
              <div className="item">
                <img src={hashIcon} alt="hashtag" className="hash" />
                <div className="block">
                  <span>Withdrawal TXID</span>
                  <div className="txhex-container">
                    <CopiedButton handleCopy={(e) => copyToClipboard(e)}>
                      <div className="copy-hex-wrap coin-modal-hex">
                        <img type="button" src={icon2} alt="icon" />
                        <span>{showDetails.coin.withdraw_txid}</span>
                      </div>
                    </CopiedButton>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="item">
              <img
                src={descripIcon}
                alt="description-icon"
                className="description"
              />
              <div className="block">
                <span>Description</span>
                <CoinDescription
                  dscrpnConfirm={dscpnConfirm}
                  description={description}
                  setDscrpnConfirm={confirmDescription}
                  handleChange={handleChange}
                />
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="action-btn-normal Body-button transparent"
          onClick={handleClose}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InfoModal;
