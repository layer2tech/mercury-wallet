import React, {useEffect, useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {StdButton, AddressInput, CopiedButton} from "../../components";
import QRCode from 'qrcode.react';

import {isWalletLoaded, callNewSeAddr, callGetSeAddr, callGetNumSeAddr, callTransferReceiver, callGetTransfers, setError, setNotification, callPingElectrum, callGetActivityLog, callAddActivityItem} from '../../features/WalletDataSlice'
import {fromSatoshi} from '../../wallet'

import Loading from '../../components/Loading/Loading';

import arrow from "../../images/arrow-up.png"
import icon2 from "../../images/icon2.png";
import closeIcon from "../../images/close-icon.png";
import info from "../../images/info.png";

import './Receive.css';
import '../Send/Send.css';

import { Transaction } from 'bitcoinjs-lib';

let addr_index = - 1;

export const resetIndex = () => {
  addr_index = -1;
}

const ReceiveStatecoinPage = () => {
  const dispatch = useDispatch();

  const [transfer_msg3, setTransferMsg3] = useState("");
  const [openTransferKey, setOpenTransferKey] = useState(false)
  const [electrumServer, setElectrumServer] = useState(true)
  const [transferLoading,setTransferLoading] = useState(false)
  const [transferKeyLoading,setTransferKeyLoading] = useState(false)
  const [counter,setCounter] = useState(0)

  const onTransferMsg3Change = (event) => {
    setTransferMsg3(event.target.value);
  };

  let num_addresses = callGetNumSeAddr();
  if(addr_index === -1) { addr_index = num_addresses - 1 };

  const [rec_sce_addr, setRecAddr] = useState(callGetSeAddr(addr_index));

  useEffect(()=> {
    // Check if Electrum server connected on page open

    checkElectrum();
    const interval = setInterval(()=> {
      //Check Electrum server every 5s
      checkElectrum();

      //Counter triggers interval to run every time it's called
      setCounter(counter+1)

    },10000)
    return()=> clearInterval(interval)
    
  },[counter])

  const checkElectrum = () => {
      callPingElectrum().then((res) => {
      if(res.height){
        setElectrumServer(true)
      }
    }).catch((err)=> {
      setElectrumServer(false)
    })
  }
  
  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const genAddrButtonAction = async () => {
    callNewSeAddr()
    num_addresses = callGetNumSeAddr();
    setRecAddr(callGetSeAddr(num_addresses - 1));
    addr_index = num_addresses - 1
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
    if (addr_index >= (num_addresses - 1)) {
      addr_index = num_addresses - 1
    } else {
      addr_index++
    }
    setRecAddr(callGetSeAddr(addr_index))
  }

  const receiveButtonAction =() => {
    // if transfer key box empty, then query server for transfer messages
    if(electrumServer){
      setTransferLoading(true)
      dispatch(callGetTransfers(addr_index)).then((res) => {
        let [nreceived, error ] = res.payload.split("../..")
        // Set Number of received statecoins and error 

        if (nreceived===0) {
            dispatch(setError({msg: "No transfers to receive."}))
          } else {
            dispatch(setNotification({msg:`Received ${nreceived} statecoins.`}))
        }
        if(error !== ""){
          dispatch(setError({msg: `Error receiving statecoins: ${error}`}))
        }

        setTransferLoading(false)
      })
      return
    }
    else{
      dispatch(setError({msg: "The Electrum network connection is lost"}))
    }
  }

  
  const receiveWithKey = () => {
    // Receive with transfer key
    setTransferKeyLoading(true)
    dispatch(callTransferReceiver(transfer_msg3)).then((res) => {
      if (res.error===undefined) {
        setTransferMsg3("")
        let amount = res.payload.state_chain_data.amount
        let locktime = Transaction.fromHex(res.payload.tx_backup_psm.tx_hex).locktime
        dispatch(setNotification({msg:"Transfer of "+fromSatoshi(amount)+" BTC complete! StateCoin expires at block height "+locktime+"."}))
        //callAddActivityItem(transfer_msg3, ACTION.RECEIVED)
      }
      setTransferKeyLoading(false)
    })
  }


  const handleOpenTransferKey = () => {
    if(electrumServer){
      setOpenTransferKey(!openTransferKey)
    }
    else{
      dispatch(setError({msg: `The Electrum network connection is lost`}))
    }
  }
  
  const copySEAddressToClipboard = (e) => {
    navigator.clipboard.writeText(rec_sce_addr.sce_address);
  }

  const tooltipHover = (e) => {

    var tooltipSpan = document.querySelector('.receiveStatecoin-scan-txid span.tooltip');
    if(tooltipSpan !== null){
      var w = window.innerWidth;
      var h = window.innerHeight;
  
      var x = e.clientX;
      var y = e.clientY;
  
      tooltipSpan.style.top = `${y+16}px`;

      if(x >= w-370){
        tooltipSpan.style.left = `${w-370+72}px`;
      }
      else{
        tooltipSpan.style.left = `${x+72}px`;
      }
      
      if(x>=w-120 && tooltipSpan.classList.contains("available")){
        tooltipSpan.style.left = `${w-120+72}px`;
      }
      else{
        tooltipSpan.style.left = `${x+72}px`;
      }
    }
  }

  const usedMessage = (coin_status) => {
    if(coin_status === "SWAPPED") return "Swap"
    if(coin_status === "AWAITING_SWAP") return "Awaiting Swap"
    if(coin_status == "INITIALISED") return "Initialised Coin"
    else return "Transfer"
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
          <div className = "Body">
            <div className = "body-title">
              <span className="title">
                <p className="receive-note">Statecoin Address</p>
              </span>
              <span className = "arrows">
                  <div className="prev-next">
                    <button
                      type="button"
                      className="Body-button transparent left"
                      onClick={prevAddrButtonAction}>
                        <img src={arrow} alt="arrow"/>
                    </button>
                    <button
                      type="button"
                      className="Body-button transparent right"
                      onClick={nextAddrButtonAction}>
                        <img src={arrow} alt="arrow"/>
                    </button>    
                  </div>
              </span>
            </div>

            <div className="receiveStatecoin-scan">
              <div className="receive-qr-code">
                {rec_sce_addr.sce_address? (<QRCode value={rec_sce_addr.sce_address} />):(null)}
              </div>
              <div className="receiveStatecoin-scan-content">
                  <div className="receiveStatecoin-scan-txid" onMouseMove = {e => tooltipHover(e)}>
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
                      className={rec_sce_addr.used === true ? (`copy-btn-wrap used`): ("copy-btn-wrap")}
                    >
                      <div className="address-index">
                        <div className="address">
                          <img type="button" src={icon2} alt="icon"/>
                          <span className="rec-address">
                            {rec_sce_addr.sce_address}
                          </span>
                        </div>
                        <div className = "info-receive">
                          <div className = "info-container">
                            <img src = {info} alt = "info" />
                            <span className = "tooltip-info index">
                              <div>Receive any Statecoins sent to the address listed here</div>
                            </span>
                          </div>
                          <button type="button" className={`Body-button receive-btn btn ${transfer_msg3 ? 'active': ''}`} onClick={(transferLoading||transferKeyLoading)===false?(receiveButtonAction):((e)=>{e.stopPropagation()})}>
                            {transferLoading?(<Loading />) : (`RECEIVE Index: ${addr_index}`)}
                          </button>
                        </div>
                      </div>
                    </CopiedButton>
                    {rec_sce_addr.used === true ? (
                    <span className="tooltip">
                      <div><b>Privacy Warning!</b></div>
                      <div><b>Last Used: </b> {usedMessage(rec_sce_addr.coin_status)}</div>
                      <div>Address used <b>{rec_sce_addr.count}</b> time(s)</div>
                    </span>
                    ):(
                      <span className="tooltip available">
                        <div><b>Available</b></div>
                      </span>
                    )}
                  </div>
                  <div className="btns-container">
                    <button
                      type="button"
                      className="Body-button transparent"
                      onClick={genAddrButtonAction}>
                        GENERATE ADDRESS
                    </button>   
                    <div className ="receive-btns">
                      <div className = "info-container">
                        <span className = "tooltip-info index">
                          <div>Receive Statecoins with unique key given by the transfer sender after transaction confirmation (mm1...)</div>
                        </span>
                        <img src = {info} alt = "info" className = "info-img"/>
                      </div>
                      <button type="button" className={`Body-button receive-btn btn ${transfer_msg3 ? 'active': ''}`} onClick={(transferLoading||transferKeyLoading)===false?(handleOpenTransferKey):(null)}>
                        {transferKeyLoading? (<Loading/>):("RECEIVE WITH KEY")}
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
              <button type="button" className={`btn ${transfer_msg3 ? 'active': ''}`} onClick={(transferLoading||transferKeyLoading)===false?(receiveWithKey):(null)}>
                {transferKeyLoading? (<Loading/>):("RECEIVE")}
              </button>
            </div>
          </div>
        </div>):(null)}
    </div>
  )
}

export default withRouter(ReceiveStatecoinPage);
