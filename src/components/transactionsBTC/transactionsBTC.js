import React, {useEffect, useState} from 'react';
import {useDispatch} from 'react-redux'
import ReactLoading from 'react-loading';

import {callDepositInit, callDepositConfirm, setNotification,
  callGetUnconfirmedAndUnmindeCoinsFundingTxData, callRemoveCoin,
  callGetConfig} from '../../features/WalletDataSlice'
import {fromSatoshi} from '../../wallet'
import { CopiedButton } from '../../components'

import btc_img from "../../images/icon1.png";
import copy_img from "../../images/icon2.png";
import arrow_img from "../../images/scan-arrow.png";
import close_img from "../../images/close-icon.png";

import '../../containers/Deposit/Deposit.css';
import '../index.css';

let QRCode = require('qrcode.react');

const keyIcon = (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    height='24px'
    viewBox='0 0 24 24'
    width='24px'
    fill='#0F54F4'
  >
    <path d='M0 0h24v24H0z' fill='none' />
    <path d='M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' />
  </svg>
);

const TransactionsBTC = (props) => {
  const [state, setState] = useState({});

  const dispatch = useDispatch();

  let testing_mode;
  try {
    testing_mode = callGetConfig().testing_mode;
  } catch {
    testing_mode = false;
  }

  // First of all run depositInit for selected deposit amount if not already complete
  props.selectedValues.forEach((item, id) => {
    if (!item.initialised && item.value !== null) {
      dispatch(callDepositInit(item.value))
      .then((res => {  // when finished update p_addr in GUI
        if (res.error===undefined) {
          props.setValueSelectionAddr(id, res.payload[1])
          setState({}) //update state to refresh TransactionDisplay render
        }
      }))
      props.setValueSelectionInitialised(id, true)
    }
  })

  // Fetch all outstanding initialised deposit_inits from wallet
  let deposit_inits = callGetUnconfirmedAndUnmindeCoinsFundingTxData();
  // Re-fetch every 10 seconds and update state to refresh render
  useEffect(() => {
    const interval = setInterval(() => {
      let new_deposit_inits = callGetUnconfirmedAndUnmindeCoinsFundingTxData()
      if (JSON.stringify(deposit_inits)!==JSON.stringify(new_deposit_inits)) {
        deposit_inits = new_deposit_inits
        setState({}) //update state to refresh TransactionDisplay render
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ** FOR TESTING **
  // Force confirm all outstanding depositInit's.
  // Get all unconfirmed coins and call depositConfirm with dummy txid value.
  const despositConfirm = () => {
    callGetUnconfirmedAndUnmindeCoinsFundingTxData().forEach((statecoin => {
      dispatch(callDepositConfirm({shared_key_id: statecoin.shared_key_id})).then((res => {
        if (res.error===undefined) {
          dispatch(setNotification({msg:"Deposit Complete! StateCoin of "+fromSatoshi(statecoin.value)+" BTC created."}))
        }
      }));
    }));
  }

  const populateWithTransactionDisplayPanels = deposit_inits.map((item, index) => {
    if (item.value != null) {
      return (
        <div key={index}>
          <div>
            <TransactionDisplay
              shared_key_id={item.shared_key_id}
              amount={item.value}
              confirmations={item.confirmations}
              address={item.p_addr}
              parent_setState={setState}/>
          </div>
      </div>
      )
    }
    return null
  })

  return (
    <div className=" deposit">
      {!deposit_inits.length ? (
        <div className="loading-trans">
          <span>Generating shared key</span>
          <div className="loading-keys">
            <span>{keyIcon}</span>
            <ReactLoading type={`cylon`} color="#0F54F4" />
            <span>{keyIcon}</span>
          </div>
        </div>
      ) : null }
      {populateWithTransactionDisplayPanels}
      {testing_mode ?
        <div className="Body">
          <button type="button" className="std-button" onClick={despositConfirm}>
          PERFORM DEPOSIT CONFIRM
          </button>
        </div>
        :
        null
      }
    </div>
  )
}

const TransactionDisplay = (props) => {

  const copyAddressToClipboard = () => {
    navigator.clipboard.writeText(props.address);
  }

  const getCofirmationsDisplayString = () => {
    if (props.confirmations===-1) {
      return "Awaiting.."
    }
    return props.confirmations+" Confirmations.."
  }

  const onCloseArrowClick = () => {
    callRemoveCoin(props.shared_key_id)
    props.parent_setState({})
  }

  // WARNING: amount is in BTC NOT satoshis.
  const makeQRCodeString = (address, amount) => "bitcoin:"+address+"?amount="+amount;

  return (
    <div className="Body">
      <div className="deposit-scan">
        <QRCode value={makeQRCodeString(props.address, fromSatoshi(props.amount))}
        level='H'
        />

        <div className="deposit-scan-content">
          <div className="deposit-scan-subtxt">
            <span>Finish Creating the Statecoin by sending exactly {fromSatoshi(props.amount)} BTC to:</span>
            <div className="deposit-scan-status">
              <span>{getCofirmationsDisplayString()}</span>
              <img src={close_img} alt="arrow" onClick={onCloseArrowClick}/>
            </div>
          </div>

          <div className="deposit-scan-main">
            <div className="deposit-scan-main-item">
              <img src={btc_img} alt="icon"/>
              <span><b>{fromSatoshi(props.amount)}</b> BTC</span>
            </div>
            <img src={arrow_img} alt="arrow"/>
            <div className="deposit-scan-main-item">
              <CopiedButton handleCopy={copyAddressToClipboard}>
                <img type="button" src={copy_img} alt="icon" />
              </CopiedButton>
              <span className="long"><b>{props.address}</b></span>
            </div>
          </div>

        </div>
      </div>
  </div>
  )
}

export default TransactionsBTC;
