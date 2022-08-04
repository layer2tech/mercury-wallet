'use strict';
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux'
import {
  callDepositInit, callDepositConfirm, setNotification,
  callGetUnconfirmedAndUnmindeCoinsFundingTxData, callRemoveCoin,
  callGetConfig,
  callAddDescription,
  callGetStateCoin,
  setIntervalIfOnline,
  callTokenDepositInit
} from '../../features/WalletDataSlice'
import { fromSatoshi } from '../../wallet'
import { CopiedButton } from '..'
import QRCodeGenerator from '../QRCodeGenerator/QRCodeGenerator'
import CoinDescription from '../inputs/CoinDescription/CoinDescription.js';

import btc_img from "../../images/icon1.png";
import copy_img from "../../images/icon2.png";
import arrow_img from "../../images/scan-arrow.png";
import close_img from "../../images/close-icon.png";

import '../../containers/Deposit/Deposit.css';
import '../index.css';
import { Spinner } from 'react-bootstrap';
import { delay } from '../../wallet/mercury/info_api';

const keyIcon = (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    height='24px'
    viewBox='0 0 24 24'
    width='24px'
    fill='var(--button-main)'
  >
    <path d='M0 0h24v24H0z' fill='none' />
    <path d='M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' />
  </svg>
);

const TransactionsBTC = (props) => {
  const [state, setState] = useState({});
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  // const { depositLoading } = useSelector((state) => state.walletData); TODO: check why this was placed in redux
  const { torInfo, fee_info } = useSelector(state => state.walletData);
  const [deleteOccured, setDeleteOccured] = useState(false);

  let testing_mode;
  try {
    testing_mode = callGetConfig().testing_mode;
  } catch {
    testing_mode = false;
  }


  useEffect(() => {
    let new_deposit_inits = callGetUnconfirmedAndUnmindeCoinsFundingTxData()
    if (JSON.stringify(deposit_inits) !== JSON.stringify(new_deposit_inits)) {
      deposit_inits.current = new_deposit_inits.reverse();
      deposit_inits.current = deposit_inits.current.filter((obj) => {
        return obj.confirmations === -1;
      });
      setState({});
      setDeleteOccured(false);
    }
  }, [deleteOccured]);

  // Re-fetch every 10 seconds and update state to refresh render
  useEffect(() => {
    let isMounted = true;
    // remove any coins with confirmations on entry
    deposit_inits.current = deposit_inits.current.filter((obj) => {
      return obj.confirmations === -1;
    });

    const interval = setIntervalIfOnline(() => {
      // if we are not in loading state
      let new_deposit_inits = callGetUnconfirmedAndUnmindeCoinsFundingTxData()
      if (JSON.stringify(deposit_inits) !== JSON.stringify(new_deposit_inits)) {
        deposit_inits.current = new_deposit_inits.reverse();
        deposit_inits.current = deposit_inits.current.filter((obj) => {
          return obj.confirmations === -1;
        });
        setState({}); //update state to refresh TransactionDisplay render
      }
    },
      torInfo.online,
        10000,
        isMounted);

    return () => {
      isMounted = false;
      clearInterval(interval);
    }
  }, []);

  const handleDepositInit = (res, id) => {
    if (res.error === undefined) {
      props.setValueSelectionAddr(id, res.payload[1]);
      let new_deposit_inits = callGetUnconfirmedAndUnmindeCoinsFundingTxData()
      if (JSON.stringify(deposit_inits) !== JSON.stringify(new_deposit_inits)) {
        deposit_inits.current = new_deposit_inits.reverse();
        deposit_inits.current = deposit_inits.current.filter((obj) => {
          return obj.confirmations === -1;
        });
        //setState({}); //update state to refresh TransactionDisplay render
      }
      setLoading(false);
    }
  }

  // First of all run depositInit for selected deposit amount if not already complete
  props.selectedValues.forEach((item, id) => {
    if (!item.initialised && item.value !== null) {
      setLoading(true);
      if(fee_info.withdraw > 0){
        dispatch(callDepositInit(item.value))
          .then((res => {  // when finished update p_addr in GUI
            handleDepositInit(res, id);
          }))
        props.setValueSelectionInitialised(id, true)
      } else {
        dispatch(callTokenDepositInit(item.value))
        .then((res => {   // when finished update p_addr in GUI
          handleDepositInit(res, id);
        }))
      props.setValueSelectionInitialised(id, true)
      }
    }
  })


  // Fetch all outstanding initialised deposit_inits from wallet
  let deposit_inits = useRef(callGetUnconfirmedAndUnmindeCoinsFundingTxData());


  // ** FOR TESTING **
  // Force confirm all outstanding depositInit's.
  // Get all unconfirmed coins and call depositConfirm with dummy txid value.
  const depositConfirm = () => {
    callGetUnconfirmedAndUnmindeCoinsFundingTxData().forEach((statecoin => {
      dispatch(callDepositConfirm({ shared_key_id: statecoin.shared_key_id })).then((res => {
        if (res.error === undefined) {
          dispatch(setNotification({ msg: "Deposit Complete! StateCoin of " + fromSatoshi(statecoin.value) + " BTC created." }))
        }
      }));
    }));
  }

  const populateWithTransactionDisplayPanels = deposit_inits.current.map((item, index) => {
    if (item.value != null) {
      return (
        <div key={index}>
          <div>
            <TransactionDisplay
              shared_key_id={item.shared_key_id}
              amount={item.value}
              confirmations={item.confirmations}
              address={item.p_addr}
              parent_setState={setState}
              parent_setDeleteOccured={setDeleteOccured}
            />
          </div>
        </div>
      )
    }
    return null
  })

  return (
    <div className=" deposit">
      {loading ? (
        <div className="loading-trans">
          <span>Generating shared key</span>
          <div className="loading-keys">
            <span>{keyIcon}</span>
            <Spinner animation='border' variant='primary' size='sm'></Spinner>
            {/*<ReactLoading type={`cylon`} color="var(--button-main)" />*/}
            <span>{keyIcon}</span>
          </div>
        </div>
      ) : null}
      {populateWithTransactionDisplayPanels}
      {testing_mode ?
        <div className="Body">
          <button type="button" className="std-button" onClick={depositConfirm}>
            PERFORM DEPOSIT CONFIRM
          </button>
        </div>
        :
        null
      }
    </div>
  )
}

// TODO: Secondary component - should be in its own file
const TransactionDisplay = (props) => {

  //User added description for coin
  const [description, setDescription] = useState("")
  const [dscpnConfirm, setDscrpnConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false);

  const copyAddressToClipboard = () => {
    navigator.clipboard.writeText(props.address);
  }
  const getCofirmationsDisplayString = () => {
    if (props.confirmations === -1) {
      return "Awaiting.."
    }
    return props.confirmations + " Confirmations.."
  }

  const onCloseArrowClick = async () => {
    setIsDeleting(true);
    // simulate timed delete
    setTimeout(async () => {
      await callRemoveCoin(props.shared_key_id);
      setIsDeleting(false);
      props.parent_setDeleteOccured(true);
    }, 1000);
  }

  //This useEffect prevents 
  useEffect(() => {
    let statecoin = callGetStateCoin(props.shared_key_id)
    if (statecoin.description !== "") {
      setDscrpnConfirm(true)
      setDescription(statecoin.description)
    }
  }, [props.shared_key_id])

  //handle input of coin description
  const handleChange = e => {
    e.preventDefault()
    if (e.target.value.length < 20) {
      setDescription(e.target.value)
    }
  }

  //Confirm description
  function confirmDescription() {
    if (dscpnConfirm === false) {
      callAddDescription(props.shared_key_id, description)
    }
    setDscrpnConfirm(!dscpnConfirm)
  }

  return (
    <div className="Body">
      <div className="deposit-scan">
        {props.confirmations === -1 && (
          <QRCodeGenerator address={props.address} amount={fromSatoshi(props.amount)}
            level='H' />
        )}

        <div className="deposit-scan-content">
          <div className="deposit-scan-subtxt">
            <CoinDescription
              dscrpnConfirm={dscpnConfirm}
              description={description}
              handleChange={handleChange}
              setDscrpnConfirm={confirmDescription} />
            <div className="deposit-scan-status">
              <p>{isDeleting}</p>
              {isDeleting ? 'Deleting...' : <span>{getCofirmationsDisplayString()}</span>}
              {props.confirmations === -1 ?
                isDeleting ?
                  <Spinner animation='border' variant='danger' size='sm'></Spinner>
                  : <img src={close_img} alt="arrow" onClick={onCloseArrowClick} /> : null}
            </div>
          </div>

          <div className="deposit-scan-main">
            <div className="deposit-scan-main-item">
              <img src={btc_img} alt="icon" />
              <span><b>{fromSatoshi(props.amount)}</b> BTC</span>
            </div>
            <img src={arrow_img} alt="arrow" />
            <div className="deposit-scan-main-item">
              {props.confirmations === -1 ? (
                <>
                  <CopiedButton handleCopy={copyAddressToClipboard}>
                    <img type="button" src={copy_img} alt="icon" />
                  </CopiedButton>
                  <span className="long"><b>{props.address}</b></span>
                </>
              ) : (
                <b>Transaction received</b>
              )}
            </div>
          </div>

        </div>
      </div>
      <span className="deposit-text">Create statecoin by sending {fromSatoshi(props.amount)} BTC to the above address in a SINGLE transaction</span>
    </div>
  )
}

export default TransactionsBTC;