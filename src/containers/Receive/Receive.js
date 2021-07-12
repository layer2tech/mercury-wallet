import React, {useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {StdButton, AddressInput, CopiedButton} from "../../components";
import QRCode from 'qrcode.react';

import {isWalletLoaded, callNewSeAddr, callGetSeAddr, callGetNumSeAddr, callTransferReceiver, callGetTransfers, setError, setNotification} from '../../features/WalletDataSlice'
import {fromSatoshi} from '../../wallet'

import arrow from "../../images/arrow-up.png"
import icon2 from "../../images/icon2.png";
import closeIcon from "../../images/close-icon.png";

import './Receive.css';
import '../Send/Send.css';

import { Transaction } from 'bitcoinjs-lib';

let addr_index = - 1;

const ReceiveStatecoinPage = () => {
  const dispatch = useDispatch();

  const [transfer_msg3, setTransferMsg3] = useState("");
  const [openTransferKey, setOpenTransferKey] = useState(false)

  const onTransferMsg3Change = (event) => {
    setTransferMsg3(event.target.value);
  };

  let num_addreses = callGetNumSeAddr();
  if(addr_index === -1) { addr_index = num_addreses - 1 };

  const [rec_sce_addr, setRecAddr] = useState(callGetSeAddr(addr_index));

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const genAddrButtonAction = async () => {
    callNewSeAddr()
    num_addreses = callGetNumSeAddr();
    setRecAddr(callGetSeAddr(num_addreses - 1));
    addr_index = num_addreses - 1
  }

  const prevAddrButtonAction = async () => {
    if (addr_index < 1) {
      addr_index = 0
    } else {
      addr_index--
    }
    setRecAddr(callGetSeAddr(addr_index))
  }

  const nextAddrButtonAction = async () => {
    if (addr_index >= (num_addreses - 1)) {
      addr_index = num_addreses - 1
    } else {
      addr_index++
    }
    setRecAddr(callGetSeAddr(addr_index))
  }

  const receiveButtonAction =() => {
    // if mgs box empty, then query server for transfer messages
    
    dispatch(callGetTransfers(addr_index)).then((res) => {
      if (res.payload===0) {
          dispatch(setError({msg: "No transfers to receive."}))
       } else {
        let nreceived = res.payload
        dispatch(setNotification({msg:"Received "+nreceived+" statecoins."}))
      }
    })
    return
  }
  
  const receiveWithKey = () => {
    dispatch(callTransferReceiver(transfer_msg3)).then((res) => {
      if (res.error===undefined) {
        setTransferMsg3("")
        let amount = res.payload.state_chain_data.amount
        let locktime = Transaction.fromHex(res.payload.tx_backup_psm.tx_hex).locktime
        dispatch(setNotification({msg:"Transfer of "+fromSatoshi(amount)+" BTC complete! StateCoin expires at block height "+locktime+"."}))
      }
    })
  }


  const handleOpenTransferKey = () => {
    setOpenTransferKey(!openTransferKey)
  }
  
  const copySEAddressToClipboard = (e) => {
    navigator.clipboard.writeText(rec_sce_addr);
  }

  return (
    <div className="container ">
        <div className="Body receiveStatecoin">
            <div className="swap-header">
                <h2 className="WalletAmount">
                    <img src={arrow} alt="arrow"/>
                    Receive Statecoins
                </h2>
                <div>
                    <Link className="nav-link" to="/home">
                        <StdButton
                            label="Back"
                            className="Body-button transparent"/>
                    </Link>
                </div>
            </div>
            <h3 className="subtitle">
                Use the address below to receive Statecoins
            </h3>
        </div>

        <div className="receiveStatecoin content">
          <div className="Body">
            <p className="receive-note">Generate Statecoin Address</p>
            <div className="receiveStatecoin-scan">
              <div className="receive-qr-code">
                <QRCode value={rec_sce_addr} />
              </div>
              <div className="receiveStatecoin-scan-content">
                  <div className="receiveStatecoin-scan-txid">
                    <CopiedButton 
                      handleCopy={copySEAddressToClipboard} 
                      style={{
                        bottom: '-30px',
                        top: 'initial',
                        backgroundColor: '#E0E0E0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#000',
                        fontWeight: 'bold'
                      }} 
                      message='Copied to Clipboard'
                    >
                      <div className="address-index">
                        <div className="address">
                          <img type="button" src={icon2} alt="icon"/>
                          <span>
                            {rec_sce_addr}
                          </span>
                        </div>
                        <span className = "index">
                          Index: {addr_index} &nbsp; &nbsp;
                        </span>
                      </div>
                    </CopiedButton>
                  </div>
                  <div className="btns-container">
                    <div className="prev-next">
                      <button
                        type="button"
                        className="Body-button transparent"
                        onClick={prevAddrButtonAction}>
                          PREV
                      </button>
                      <button
                        type="button"
                        className="Body-button transparent"
                        onClick={nextAddrButtonAction}>
                          NEXT
                      </button>    
                    </div>
                    <button
                      type="button"
                      className="Body-button transparent"
                      onClick={genAddrButtonAction}>
                        GENERATE ANOTHER ADDRESS
                    </button>   
                    <div className ="receive-btns">
                      <button type="button" className={`Body-button btn ${transfer_msg3 ? 'active': ''}`} onClick={receiveButtonAction}>
                        RECEIVE
                      </button>
                      <button type="button" className={`Body-button btn ${transfer_msg3 ? 'active': ''}`} onClick={handleOpenTransferKey}>
                        RECEIVE WITH KEY
                      </button>
                    </div>           
                </div>
              </div>
            </div>
          </div>
        </div>

        { openTransferKey===true ? (
        <div className="receiveStatecoin sendStatecoin content">
          <div className="overlay" onClick={handleOpenTransferKey}></div>
          <div className="Body center">
            <button className="primary-btm ghost" onClick={handleOpenTransferKey}>
              <img src={closeIcon} alt="close-button"/>
            </button>
            <p className="receive-note">Transfer Key:</p>
            <div className="receive-bottom">
              <AddressInput
                inputAddr={transfer_msg3}
                onChange={onTransferMsg3Change}
                placeholder='mm1...'
                smallTxtMsg='Transfer Code'/>
              <button type="button" className={`btn ${transfer_msg3 ? 'active': ''}`} onClick={receiveWithKey}>
                RECEIVE
              </button>
            </div>
          </div>
        </div>):(null)}
    </div>
  )
}

export default withRouter(ReceiveStatecoinPage);
