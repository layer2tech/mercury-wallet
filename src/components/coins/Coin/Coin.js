import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { STATECOIN_STATUS, BACKUP_STATUS } from "../../../wallet";
import close_img from "../../../images/close-icon.png";
import copy_img from "../../../images/icon2.png";
import scAddrIcon from "../../../images/sc_address_logo.png";
import timeIcon from "../../../images/time.png";
import { MINIMUM_DEPOSIT_SATOSHI, fromSatoshi } from "../../../wallet/util";
import { DAYS_WARNING, SWAP_STATUS_INFO } from "../CoinsList";
import { ProgressBar, Spinner } from "react-bootstrap";
import Moment from "react-moment";
import SwapStatus from "../SwapStatus/SwapStatus";
import { callGetActivityLog, callGetActivityLogItems, setError } from "../../../features/WalletDataSlice";
import { CoinStatus, CopiedButton } from "../..";

const TESTING_MODE = require("../../../settings.json").testing_mode;

const SWAP_TOOLTIP_TXT = {
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
}

const Coin = (props) => {
  const dispatch = useDispatch()

  props.coin_data.privacy_data = props.getPrivacyScoreDesc(props.coin_data)

  let activityData = callGetActivityLogItems(10)

  const updateTransferDate = (coin_data) => {

    if (coin_data.status === STATECOIN_STATUS.IN_TRANSFER) {
      let transferDate = 'DATE'

      let activity_log = callGetActivityLogItems(callGetActivityLog().items.length)
      let date = activity_log.filter(e => e.funding_txid === coin_data.funding_txid && e.action === "T" && e.date > coin_data.timestamp)
      // filter Activity Log for txid, transferred icon and activity sent after coin created (timestamp)

      date = date.sort((a, b) => b.date - a.date).reverse()[0]?.date
      // Sort by most recent i.e. coin most recently created with same txid
      // prevents retrieving old date props.coin_data from activity log if coin transferred more than once

      date = new Date(date).toString().split('+')[0]

      transferDate = date
      return transferDate
    }

  }

  // Set selected coin
  const selectCoin = (shared_key_id) => {
    props.setSelectedCoin(shared_key_id);
    //setRefreshCoins((prevState) => !prevState); - not being used
    if (props.displayDetailsOnClick) {
      props.handleOpenCoinDetails(shared_key_id)
    }
    if (props.setCoinDetails) {
      props.handleSetCoinDetails(shared_key_id)
    }
  }

  const isSelected = (shared_key_id) => {
    let selected = false;
    if (props.selectedCoins === undefined) {
      selected = (props.selectedCoin === shared_key_id)
    } else {
      props.selectedCoins.forEach(
        (selectedCoin) => {
          if (selectedCoin === shared_key_id) {
            selected = true;
          }
        }
      );
    }
    return selected;
  }

  //Button to handle copying p address to keyboard
  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation()
    navigator.clipboard.writeText(address);
  }

  const displayExpiry = (coin_data) => {
    let invalidDisplay = [STATECOIN_STATUS.IN_MEMPOOL, STATECOIN_STATUS.UNCONFIRMED, BACKUP_STATUS.IN_MEMPOOL, BACKUP_STATUS.PRE_LOCKTIME]
    for (var i = 0; i < invalidDisplay.length; i++)
      if (coin_data.status === invalidDisplay[i]) {
        return <>Loading expiry data...</>
      }
    // otherwise return the proper time until expiry
    return (
      <div className="CoinTimeLeft">
        <img src={timeIcon} alt="icon" />

        <div className="scoreAmount">
          Time Until Expiry: <span className='expiry-time-left'>{props.displayExpiryTime(props.coin_data.expiry_data)}</span>
          <span className="tooltip">
            <b>Important: </b>
                  Statecoin must be withdrawn before expiry.
            </span>
        </div>
      </div>)
  }
  return (
    <div>
      {
        props.isMainPage && !props.coin_data.deleting && props.coin_data.status === "INITIALISED" &&
        <div className="CoinTitleBar">
          <img className='close' src={close_img} alt="arrow" onClick={() => props.onDeleteCoinDetails(props.coin_data)} />
        </div>
      }
      <div
        className={`coin-item ${(props.swap || props.send || props.withdraw) ? props.coin_data.status : ''} ${isSelected(props.coin_data.shared_key_id) ? 'selected' : ''}`}
        onClick={() => {
          if ((props.coin_data.status === STATECOIN_STATUS.SWAPLIMIT) && (props.swap)) {
            dispatch(setError({ msg: 'Locktime below limit for swap participation' }))
            return false;
          }
          if ((props.coin_data.status === STATECOIN_STATUS.SWAPLIMIT || props.coin_data.status === STATECOIN_STATUS.EXPIRED) && (props.swap || props.send || props.withdraw)) {
            dispatch(setError({ msg: 'Expired coins are unavailable for transfer, swap and withdrawal' }))
            return false;
          }

          if ((props.coin_data.status === STATECOIN_STATUS.IN_MEMPOOL || props.coin_data.status === STATECOIN_STATUS.UNCONFIRMED) && (props.swap || props.send || props.withdraw) && !TESTING_MODE) {
            dispatch(setError({ msg: 'Coin unavailable for swap - awaiting confirmations' }))
            return false
          }
          if (props.coin_data.status === STATECOIN_STATUS.INITIALISED && (props.swap || props.send || props.withdraw)) {
            dispatch(setError({ msg: `Coin uninitialised: send BTC to address displayed` }))
            return false
          }
          if (props.coin_data.status === (STATECOIN_STATUS.IN_SWAP || STATECOIN_STATUS.AWAITING_SWAP) && (props.send || props.withdraw)) {
            dispatch(setError({ msg: `Unavailable while coin in swap group` }))
            return false
          }
          else {
            selectCoin(props.coin_data.shared_key_id)
          }
        }}
      >
        <div className="CoinPanel">
          <div className="CoinAmount-block">
            <img src={props.coin_data.privacy_data.icon1} alt="icon" />
            <span className="sub">
              <b className={props.coin_data.value < MINIMUM_DEPOSIT_SATOSHI ? "CoinAmountError" : "CoinAmount"}>  {fromSatoshi(props.coin_data.value)} BTC</b>
              {props.filterBy === STATECOIN_STATUS.IN_TRANSFER ? (
                <div className="scoreAmount">
                  {updateTransferDate(props.coin_data)}
                </div>
              ) : (
                <div className="scoreAmount">
                  <img src={props.coin_data.privacy_data.icon2} alt="icon" />
                  {props.coin_data.privacy_data.rounds}
                  <span className="tooltip">
                    <b>{props.coin_data.privacy_data.rounds}:</b>
                    {props.coin_data.privacy_data.rounds_msg}
                  </span>
                </div>)}
            </span>
          </div>
          {(props.filterBy !== STATECOIN_STATUS.WITHDRAWN
            && props.filterBy !== STATECOIN_STATUS.WITHDRAWING) ? (
            props.coin_data.status === STATECOIN_STATUS.INITIALISED ?
              <div>
                <div className="deposit-scan-main-item">
                  <CopiedButton handleCopy={(event) => copyAddressToClipboard(event, props.getAddress(props.coin_data.shared_key_id))}>
                    <img type="button" src={copy_img} alt="icon" />
                  </CopiedButton>
                  <span className="long"><b>{props.getAddress(props.coin_data.shared_key_id)}</b></span>
                </div>
              </div>
              : (
                <div className="progress_bar" id={props.coin_data.expiry_data.days < DAYS_WARNING ? 'danger' : 'success'}>
                  <div className="coin-description">
                    <p>{props.coin_data.description}</p>
                  </div>
                  {
                    props.coin_data.value < MINIMUM_DEPOSIT_SATOSHI &&
                    (
                      <div class='CoinAmountError'>
                        <div className="scoreAmount">
                          Coin in error state: below minimum deposit values
                            <span className="tooltip">
                            This coin cannot be swapped but can be withdrawn in a batch with other coins.
                            </span>
                        </div>
                      </div>
                    )
                  }
                  <div className="sub">
                    <ProgressBar>
                      <ProgressBar striped variant={props.coin_data.expiry_data.days < DAYS_WARNING ? 'danger' : 'success'}
                        now={props.coin_data.expiry_data.days * 100 / 90}
                        key={1} />
                    </ProgressBar>
                  </div>
                  {
                    displayExpiry(props.coin_data)
                  }
                </div>
              )) : (
            <div className="widthdrawn-status">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0.5C3.875 0.5 0.5 3.875 0.5 8C0.5 12.125 3.875 15.5 8 15.5C12.125 15.5 15.5 12.125 15.5 8C15.5 3.875 12.125 0.5 8 0.5ZM12.875 9.125H3.125V6.875H12.875V9.125Z" fill="#BDBDBD" />
              </svg>
              <span>
                Withdrawn <span className="widthdrawn-status-time">| {<Moment format="MM.DD.YYYY HH:mm">{props.coin_data.timestamp}</Moment>}</span>
              </span>
            </div>
          )}

          {
            props.swap &&
            <div>
              <label className='toggle'>
                Auto-swap
                  </label>
              <label className="toggle-sm">

                <input
                  className="toggle-checkbox"
                  type="checkbox"
                  onChange={e => props.handleAutoSwap(props.coin_data)}
                  checked={props.coin_data.swap_auto}
                />
                <div className="toggle-switch" />
              </label>
            </div>
          }

          {props.showCoinStatus ? (
            <div className="coin-status-or-txid">

              {(props.coin_data.status === STATECOIN_STATUS.AVAILABLE
                || props.coin_data.status === STATECOIN_STATUS.WITHDRAWN
                || props.coin_data.status === STATECOIN_STATUS.WITHDRAWING
              ) ?
                (
                  <b className="CoinFundingTxid">
                    <img src={scAddrIcon} className="sc-address-icon" alt="icon" />
                    {props.coin_data.sc_address}
                  </b>
                )
                : (
                  <div>
                    {props.coin_data.swap_status == null && <CoinStatus data={props.coin_data} />}
                    <div className="swap-status-container coinslist" >
                      {props.coin_data.swap_status !== "Init" ?
                        (<span className={`tooltip ${document.querySelector(".home-page") ? ("main") : ("side")}`}>
                          <b>{props.coin_data.ui_swap_status}: </b>{SWAP_TOOLTIP_TXT[props.coin_data.ui_swap_status]}
                        </span>) : (null)}
                      {props.coin_data.swap_status !== null && (
                        <div>
                          <Spinner animation="border" variant="primary" size="sm" />
                          <SwapStatus swapStatus={SWAP_STATUS_INFO[props.coin_data.ui_swap_status]} swap_error={props.coin_data.swap_error} />
                        </div>
                      )}
                    </div>
                  </div>)}
            </div>
          ) : (
            <div className="coin-status-or-txid">
              <b className="CoinFundingTxid">
                <img src={scAddrIcon} className="sc-address-icon" alt="icon" />
                {props.coin_data.sc_address}
              </b>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default React.memo(Coin, (prevProps, nextProps) => {
  if (prevProps.showCoinStatus !== nextProps.showCoinStatus ||
    prevProps.isMainPage !== nextProps.isMainPage ||
    prevProps.coin_data !== nextProps.coin_data ||
    prevProps.swap !== nextProps.swap ||
    prevProps.send !== nextProps.send ||
    prevProps.withdraw !== nextProps.withdraw ||
    prevProps.selectedCoin !== nextProps.selectedCoin ||
    prevProps.selectedCoins !== nextProps.selectedCoins ||
    prevProps.displayDetailsOnClick !== nextProps.displayDetailsOnClick ||
    prevProps.filterBy !== nextProps.filterBy ||
    prevProps.render !== nextProps.render) {
    return false
    // will rerender if these props change
  }
  else {
    return true
    // will not rerender
  }
})