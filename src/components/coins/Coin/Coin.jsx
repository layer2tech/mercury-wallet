"use strict";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { STATECOIN_STATUS, BACKUP_STATUS, ACTION } from "../../../wallet";
import close_img from "../../../images/close-icon.png";
import copy_img from "../../../images/icon2.png";
import scAddrIcon from "../../../images/sc_address_logo.png";
import statechainIcon from "../../../images/statechainIcon.png";
import timeIcon from "../../../images/time.png";
import awaitingIcon from "../../../images/time_left.png";
import duplicateIcon from "../../../images/plus-black.png";
import { MINIMUM_DEPOSIT_SATOSHI, fromSatoshi } from "../../../wallet/util";
import { DAYS_WARNING, SWAP_STATUS_INFO } from "../CoinsList";
import { ProgressBar, Spinner } from "react-bootstrap";
import Moment from "react-moment";
import { useLocation } from "react-router-dom";
import SwapStatus from "../SwapStatus/SwapStatus";
import {
  callGetActivityDate,
  callGetActivityLog,
  callGetActivityLogItems,
  callGetNetwork,
  callGetStateCoin,
  callRemoveCoin,
  callSetStatecoinSpent,
  setError,
  setShowDetails,
  setWarning,
} from "../../../features/WalletDataSlice";
import { CoinStatus, CopiedButton } from "../..";
import { HIDDEN } from "../../../wallet/statecoin";
import {
  displayExpiryTime,
  getPrivacyScoreDesc,
} from "../CoinFunctionUtils/CoinFunctionUtils";
import Tooltip from "../../Tooltips/Tooltip";
import ImgAndInfo from "../../ImgAndInfo/ImgAndInfo";
import AddressDisplay from "../../AddressDisplay/AddressDisplay";
import ProgressContainer from "../ProgressContainer/ProgressContainer";
import AutoSwapToggle from "../../AutoSwapToggle/AutoSwapToggle";
import isElectron from "is-electron";

const TESTING_MODE = require("../../../settings.json").testing_mode;
const SWAP_AMOUNTS = require("../../../settings.json").swap_amounts;

const SWAP_TOOLTIP_TXT = {
  SingleSwapMode:
    "Coin is waiting in queue to ensure you swap with someone else",
  Phase0: "Coin registered for swap group - awaiting swap start",
  Phase1: "Swap group start. Awaiting blind swap token",
  Phase2: "Awaiting signature for coin transfer",
  Phase3: "Generating new Tor circuit.",
  Phase4: "Awaiting address for coin transfer",
  Phase5: "Transferring statecoin",
  Phase6: "Receiving new statecoin",
  Phase7: "Finalizing transfers",
  Phase8: "Completing statecoin swap",
  End: "Finalizing coin swap transfers",
};

const Coin = (props) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const [swapPage, setSwapPage] = useState(
    location.pathname === "/swap_statecoin"
  );
  const [sendPage, setSendPage] = useState(
    location.pathname === "/send_statecoin"
  );
  const [withdrawPage, setWithdrawPage] = useState(
    location.pathname === "/withdraw"
  );

  const { balance_info, filterBy } = useSelector((state) => state.walletData);

  const updateTransferDate = (coin_data) => {
    if (coin_data.status === STATECOIN_STATUS.IN_TRANSFER) {
      let transferDate = "DATE";

      let activity_log = callGetActivityLogItems();
      let date = activity_log.filter(
        (e) =>
          e.funding_txid === coin_data.funding_txid &&
          e.action === "T" &&
          e.date > coin_data.timestamp
      );
      // filter Activity Log for txid, transferred icon and activity sent after coin created (timestamp)

      date = date.sort((a, b) => b.date - a.date).reverse()[0]?.date;
      // Sort by most recent i.e. coin most recently created with same txid
      // prevents retrieving old date props.coin_data from activity log if coin transferred more than once

      date = new Date(date).toString().split("+")[0];

      transferDate = date;
      return transferDate;
    }
  };

  // Set selected coin
  const selectCoin = (shared_key_id) => {
    props.setSelectedCoin(shared_key_id);
    //setRefreshCoins((prevState) => !prevState); - not being used
    if (props.displayDetailsOnClick) {
      handleOpenCoinDetails();
    }
    if (props.setCoinDetails) {
      handleSetCoinDetails();
    }
  };

  const isSelected = (shared_key_id) => {
    let selected = false;
    if (props.selectedCoins === undefined) {
      selected = props.selectedCoin === shared_key_id;
    } else {
      props.selectedCoins.forEach((selectedCoin) => {
        if (selectedCoin === shared_key_id) {
          selected = true;
        }
      });
    }
    return selected;
  };

  const displayExpiry = (coin_data) => {
    let invalidDisplay = [
      STATECOIN_STATUS.IN_MEMPOOL,
      STATECOIN_STATUS.UNCONFIRMED,
      BACKUP_STATUS.IN_MEMPOOL,
      BACKUP_STATUS.PRE_LOCKTIME,
    ];

    // there can't be a valid expiry date if blocks are -1
    if (
      coin_data.expiry_data.blocks === -1 &&
      coin_data.expiry_data.days === 0 &&
      coin_data.expiry_data.months === 0
    ) {
      for (var i = 0; i < invalidDisplay.length; i++)
        if (coin_data.status === invalidDisplay[i]) {
          return (
            <>
              <p>
                Loading expiry data...{" "}
                <Spinner
                  animation="border"
                  variant="primary"
                  size="sm"
                ></Spinner>
              </p>
            </>
          );
        }
    }

    // otherwise return the proper time until expiry
    return (
      <div className="CoinTimeLeft">
        <img src={timeIcon} alt="icon" className="time" />

        <div className="scoreAmount">
          Time Until Expiry:{" "}
          <span className="expiry-time-left">
            {displayExpiryTime(props.coin_data.expiry_data)}
          </span>
          <Tooltip
            boldText={"Important:"}
            text={"Statecoin must be withdrawn before expiry."}
          />
        </div>
      </div>
    );
  };

  const handleOpenCoinDetails = () => {
    dispatch(setShowDetails({ show: true, coin: props.coin_data }));
  };

  const deleteCoin = async (item) => {
    item = {
      ...item,
      status: STATECOIN_STATUS.DELETED,
      deleting: true,
      privacy_data: {
        ...item.privacy_data,
        msg: "coin currently being deleted",
      },
    };

    await callRemoveCoin(item.shared_key_id);
    // setConfirmCoinAction({ show: false});
  };

  const handleDeleteCoin = (e) => {
    e.stopPropagation();
    // props.unmountMe();
    dispatch(
      setWarning({
        title: "Delete coin...",
        msg: "Are you sure you want to delete this coin ?",
        onConfirm: deleteCoin,
        data: props.coin_data,
      })
    );
  };

  const handleWithdrawExpiredCoin = (e) => {
    e.stopPropagation();

    dispatch(
      setWarning({
        title: "Change coin status",
        msg: "Are you sure you wish to set this expired coin as withdrawn?",
        onConfirm: withdrawExpiredCoin,
        data: props.coin_data,
      })
    );
  };

  const withdrawExpiredCoin = async (item) => {
    dispatch(
      callSetStatecoinSpent({ id: item.shared_key_id, action: ACTION.WITHDRAW })
    );
  };

  const handleSetCoinDetails = () => {
    props.setCoinDetails(props.coin_data);
  };

  return (
    <div>
      <div
        className={`coin-item ${
          swapPage || sendPage || withdrawPage ? props.coin_data.status : ""
        } ${isSelected(props.coin_data.shared_key_id) ? "selected" : ""}`}
        onClick={(event) => {
          if (typeof event.target.className === 'string' && event.target.className.includes("toggle")) {
            return;
          }
          if (
            props.coin_data.status === STATECOIN_STATUS.SWAPLIMIT &&
            swapPage
          ) {
            dispatch(
              setError({ msg: "Locktime below limit for swap participation" })
            );
            return false;
          }
          if (!SWAP_AMOUNTS.includes(props.coin_data.value) && swapPage) {
            dispatch(
              setError({ msg: "Swap not available for this coin value" })
            );
            return false;
          }
          if (
            props.coin_data.status === STATECOIN_STATUS.EXPIRED &&
            (swapPage || sendPage)
          ) {
            dispatch(
              setError({
                msg: "Expired coins are unavailable for transfer or swap",
              })
            );
            return false;
          }
          if (
            props.coin_data.status === STATECOIN_STATUS.EXPIRED &&
            withdrawPage &&
            props.coin_data.BACKUP_STATUS !== BACKUP_STATUS.MISSING &&
            props.coin_data.BACKUP_STATUS !== BACKUP_STATUS.BELOW_MIN_FEE
          ) {
            dispatch(
              setError({
                msg: "Expired coins withdrawn from backup transaction",
              })
            );
            return false;
          }
          if (
            props.coin_data.backup_status === BACKUP_STATUS.MISSING &&
            (swapPage || sendPage)
          ) {
            dispatch(
              setError({
                msg: "Backup transaction missing on recovery. Coin must be withdrawn.",
              })
            );
            return false;
          }
          if (
            (props.coin_data.status === STATECOIN_STATUS.IN_MEMPOOL ||
              props.coin_data.status === STATECOIN_STATUS.UNCONFIRMED) &&
            (swapPage || sendPage || withdrawPage) &&
            !TESTING_MODE
          ) {
            dispatch(
              setError({
                msg: "Coin unavailable for swap - awaiting confirmations",
              })
            );
            return false;
          }
          if (
            props.coin_data.status === STATECOIN_STATUS.INITIALISED &&
            (swapPage || sendPage || withdrawPage)
          ) {
            dispatch(
              setError({
                msg: `Coin uninitialised: send BTC to address displayed`,
              })
            );
            return false;
          }
          if (
            props.coin_data.status ===
              (STATECOIN_STATUS.IN_SWAP || STATECOIN_STATUS.AWAITING_SWAP) &&
            (sendPage || withdrawPage)
          ) {
            dispatch(setError({ msg: `Unavailable while coin in swap group` }));
            return false;
          }
          if (
            props.coin_data.status === STATECOIN_STATUS.WITHDRAWING &&
            (sendPage || swapPage)
          ) {
            dispatch(
              setError({ msg: `Coin withdrawn - unavailable for transfer` })
            );
            return false;
          }
          if (
            props.coin_data.status === STATECOIN_STATUS.DUPLICATE &&
            (sendPage || swapPage)
          ) {
            dispatch(
              setError({
                msg: `Deposit duplicate - unavailable for transfer or swap`,
              })
            );
            return false;
          } else {
            selectCoin(props.coin_data.shared_key_id);
          }
        }}
      >
        <div
          className={`CoinPanel ${
            props.coin_data.status === STATECOIN_STATUS.EXPIRED
              ? "expired"
              : null
          }`}
        >
          <Tooltip
            condition={props.coin_data.status === STATECOIN_STATUS.DUPLICATE}
            className={"dup-container"}
            boldText={"Duplicate Coin Warning!"}
            text={
              "This coin can only be withdrawn after the statecoin sharing the deposit address has been withdrawn and confirmed."
            }
          />

          <Tooltip
            condition={props.coin_data.status === STATECOIN_STATUS.EXPIRED}
            className={"expired-tooltip"}
            title={"Backup tx sent."}
            text={
              "To retrieve coin, go to Settings -> Manage Backup Transactions to export private key or send to new address"
            }
          />

          {/* 
          Needs double check that no styling is incorrect
          
        {(props.coin_data.status === STATECOIN_STATUS.DUPLICATE) ?(
          <div className="dup-container">
            <span className="tooltip">
              <b>Duplicate Coin Warning!</b> This coin can only be withdrawn after the statecoin sharing the deposit address has been withdrawn and confirmed. 
            </span>
          </div>): (null) } */}

          <ImgAndInfo
            imgsrc1={props.coin_data.privacy_data.icon1}
            imgsrc2={props.coin_data.privacy_data.icon2}
            bClass={
              props.coin_data.value < MINIMUM_DEPOSIT_SATOSHI
                ? "CoinAmountError"
                : "CoinAmount"
            }
            boldText={`${
              balance_info.hidden ? HIDDEN : fromSatoshi(props.coin_data.value)
            } BTC`}
            condition={filterBy === STATECOIN_STATUS.IN_TRANSFER}
            subText={updateTransferDate(props.coin_data)}
            imgSubText={props.coin_data.privacy_data.rounds}
            tooltipBoldText={`${props.coin_data.privacy_data.rounds}:`}
            tooltipText={props.coin_data.privacy_data.rounds_msg}
          />

          {filterBy !== STATECOIN_STATUS.WITHDRAWN &&
          filterBy !== STATECOIN_STATUS.WITHDRAWING ? (
            props.coin_data.status === STATECOIN_STATUS.INITIALISED ? (
              <AddressDisplay shared_key_id={props.coin_data.shared_key_id} />
            ) : (
              <ProgressContainer
                progressAlert={props.coin_data.value < MINIMUM_DEPOSIT_SATOSHI}
                description={props.coin_data.description}
                ifErr={props.coin_data.value < MINIMUM_DEPOSIT_SATOSHI}
                percentage={(props.coin_data.expiry_data.days * 100) / 90}
                subText={displayExpiry(props.coin_data)}
              />
            )
          ) : (
            <div className="widthdrawn-status">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 0.5C3.875 0.5 0.5 3.875 0.5 8C0.5 12.125 3.875 15.5 8 15.5C12.125 15.5 15.5 12.125 15.5 8C15.5 3.875 12.125 0.5 8 0.5ZM12.875 9.125H3.125V6.875H12.875V9.125Z"
                  fill="#BDBDBD"
                />
              </svg>
              <span>
                Withdrawn{" "}
                <span className="widthdrawn-status-time">
                  |{" "}
                  {
                    <Moment format="MM.DD.YYYY HH:mm">
                      {callGetActivityDate(
                        props.coin_data.shared_key_id,
                        ACTION.WITHDRAW
                      )}
                    </Moment>
                  }
                </span>
              </span>
            </div>
          )}
          <div className="autoSwapToggle">
            <AutoSwapToggle coin_data={props.coin_data} />
            <Tooltip
              boldText={"Swap pool:"}
              text={`Currently ${props.coin_data.participants} coins participating.`}
            />
          </div>

          {props.showCoinStatus ? (
            <div className="coin-status-or-txid">
              {props.coin_data.status === STATECOIN_STATUS.AVAILABLE ||
              props.coin_data.status === STATECOIN_STATUS.WITHDRAWN ? (
                // probably needs another variable to check if its awaiting in swap
                props.coin_data.swap_auto ? (
                  <div>
                    <CoinStatus data={props.coin_data} />
                    {
                      <span
                        className={`tooltip ${
                          document.querySelector(".home-page") ? "main" : "side"
                        }`}
                      >
                        <b>{props.coin_data.ui_swap_status}: </b>
                        {SWAP_TOOLTIP_TXT.SingleSwapMode}
                      </span>
                    }
                    <Spinner animation="border" variant="warning" size="sm" />
                    <SwapStatus swapStatus={SWAP_STATUS_INFO.SingleSwapMode} />
                  </div>
                ) : (
                  <b className="CoinFundingTxid">
                    <img
                      src={statechainIcon}
                      className="sc-address-icon"
                      alt="icon"
                    />
                    {props.coin_data.sc_address}
                  </b>
                )
              ) : props.coin_data.status === STATECOIN_STATUS.WITHDRAWING ? (
                <b className="CoinFundingTxid">
                  <img
                    src={awaitingIcon}
                    className="awaiting-icon"
                    alt="icon"
                  />
                  {props.coin_data.sc_address}
                  <span className="tooltip">
                    Withdrawn: awaiting deposit confirmation
                  </span>
                </b>
              ) : props.coin_data.status === STATECOIN_STATUS.DUPLICATE ? (
                <div className="scoreAmount">
                  <img
                    src={duplicateIcon}
                    className="duplicate-icon"
                    alt="icon"
                  />
                  <b>Duplicate</b>
                </div>
              ) : (
                <div>
                  {props.coin_data.swap_status == null && (
                    <CoinStatus data={props.coin_data} />
                  )}
                  <div className="swap-status-container coinslist">
                    {props.coin_data.swap_status !== "Init" ? (
                      <span
                        className={`tooltip ${
                          document.querySelector(".home-page") ? "main" : "side"
                        }`}
                      >
                        <b>{props.coin_data.ui_swap_status}: </b>
                        {SWAP_TOOLTIP_TXT[props.coin_data.ui_swap_status]}
                      </span>
                    ) : null}
                    {props.coin_data.swap_status !== null && (
                      <div>
                        <Spinner
                          animation="border"
                          variant="primary"
                          size="sm"
                        />
                        <SwapStatus
                          swapStatus={
                            SWAP_STATUS_INFO[props.coin_data.ui_swap_status]
                          }
                          swap_error={props.coin_data.swap_error}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="coin-status-or-txid">
              <b className="CoinFundingTxid">
                <img
                  src={statechainIcon}
                  className="sc-address-icon"
                  alt="icon"
                />
                {props.coin_data.sc_address}
              </b>
            </div>
          )}
          {props.coin_data.status === STATECOIN_STATUS.EXPIRED && (
            <button className="Body-button expired">
              <img
                className="close"
                src={close_img}
                alt="arrow"
                onClick={(e) => handleWithdrawExpiredCoin(e)}
              />
            </button>
          )}
          {isElectron() && props.isMainPage && !props.coin_data.deleting && (
            <div className="Body-button expired">
              <img
                className="close"
                src={close_img}
                alt="arrow"
                onClick={(e) => handleDeleteCoin(e)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Coin, (prevProps, nextProps) => {
  if (
    prevProps.showCoinStatus !== nextProps.showCoinStatus ||
    prevProps.isMainPage !== nextProps.isMainPage ||
    prevProps.coin_data !== nextProps.coin_data ||
    prevProps.selectedCoin !== nextProps.selectedCoin ||
    prevProps.selectedCoins !== nextProps.selectedCoins ||
    prevProps.displayDetailsOnClick !== nextProps.displayDetailsOnClick ||
    prevProps.render !== nextProps.render
  ) {
    return false;
    // will rerender if these props change
  } else {
    return true;
    // will not rerender
  }
});