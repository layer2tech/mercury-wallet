'use strict';
import React, { useEffect, useState } from 'react';
import { Link, withRouter, Redirect } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { StdButton, AddressInput, SendModal, ConfirmPopup, Loading, CoinsList } from "../../components";

import { fromSatoshi, pubKeyFromXpub } from '../../wallet/util';
import { decodeSCEAddress,encodeSCEAddress,  encodeMessage } from '../../wallet/util';
import {
  isWalletLoaded, callTransferSender, setError, setNotification,
  removeCoins,
  checkSend,
  callProofKeyFromXpub,
  callSumStatecoinValues
} from '../../features/WalletDataSlice';
import arrow from "../../images/arrow-up.png"
import './Send.css';

const SendStatecoinPage = () => {

  const dispatch = useDispatch();

  const [openSendModal, setOpenSendModal] = useState({ show: false });
  const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id
  
  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [forceRender, setRender]  =  useState({});

  const [coinDetails, setCoinDetails] = useState({}); // store selected coins shared_key_id
  const [inputAddr, setInputAddr] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [transferMsg3, setTransferMsg3] = useState('');
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render
  const [loading, setLoading] = useState(false);

  const balance_info = useSelector(state => state.walletData).balance_info;
  const error_dialogue = useSelector(state => state.walletData).error_dialogue;

  const onInputAddrChange = (event) => {
    setInputAddr(event.target.value);
  };

  //When Send Modal (with transfer key) opens send button reactivated 
  useEffect(() => {
    let isMounted = true
    if (isMounted === true && transferMsg3 !== '') {
      setLoading(false)
    }
    return () => { isMounted = false }
  }, [transferMsg3])

  //When error box appears
  useEffect(() => {
    if (!error_dialogue.seen) {
      setLoading(false);
    }
  }, [error_dialogue.seen])

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const sendButtonCheck = async () => {
    // check statechain is chosen
    selectedCoins.forEach(async selectedCoin => {
      if (selectedCoin == null) {
        dispatch(setError({ msg: "Please choose a StateCoin to send." }))
        return
      }
      if (!inputAddr) {
        dispatch(setError({ msg: "Please enter an StateCoin address to send to." }))
        return
      }
    })

    await sendButtonAction()
  }

  const sendButtonAction = async () => {
    var input_pubkey = "";

    try {
      if(inputAddr.substring(0,4) === 'xpub' || inputAddr.substring(0,4) === 'tpub'){
        input_pubkey = callProofKeyFromXpub(inputAddr,0);
      } else{
        input_pubkey = decodeSCEAddress(inputAddr);
      }
    }
    catch (e) {
      dispatch(setError({ msg: "Error: " + e.message }))
      return
    }


    var pubKeyArray = [];

    for( var i = 0 ; i < selectedCoins.length ; i++){
      if(inputAddr.substring(0,4) === 'xpub' || inputAddr.substring(0,4) === 'tpub'){
        pubKeyArray.push(callProofKeyFromXpub(inputAddr,i))
      }
      else{
        pubKeyArray.push(input_pubkey)
      }
    }

    setOpenSendModal({
      show: true,
      value: callSumStatecoinValues(selectedCoins),
      coinAddress: inputAddr
    })
    // Add loop for as many pub keys as selected coins
    // Add error for sending to more than one address
    // Test for a valid xPub

    setLoading(true);
    dispatch(callTransferSender({ "shared_key_ids": selectedCoins, "rec_addr": pubKeyArray }))
      .then(res => {

        if (res.error === undefined) {

          let transferCode = []
          res.payload.forEach(res => {
            transferCode.push(encodeMessage(res));
          })
          setTransferMsg3(transferCode);
          setOpenSendModal({
            show: true,
            value: coinDetails.value,
            transfer_code: transferCode,
            coinAddress: inputAddr
          });
          setSelectedCoins([])
          setInputAddr([])
          setRefreshCoins(!refreshCoins)
        }
        if (res.error !== undefined) {
          setLoading(false);
          setOpenSendModal({
            show: false
          })
          setSelectedCoins([])
          setInputAddr([])
        }
      })
  }

  const addSelectedCoin = (statechain_id, event) => {

    if(loading) return
    // Stop coins removing if clicked while pending transaction
    
    let newSelectedCoins = selectedCoins;
    const isStatechainId = (element) => element === statechain_id;
    let index = newSelectedCoins.findIndex(isStatechainId);
    if (index !== -1){
      newSelectedCoins.splice(index,1);
    } else {
      newSelectedCoins.push(statechain_id);
    }
    setSelectedCoins(newSelectedCoins);
    setRender({});
  }

  /*
  const copyTransferMsgToClipboard = () => {
    navigator.clipboard.writeText(transferMsg3);
  }*/

  const handleConfirm = (pass) => {
    setInputAddr("")
    setSelectedCoin('')
    setRefreshCoins((prevState) => !prevState);
    setOpenSendModal({ show: false })
    setCoinDetails({})
    dispatch(setNotification({ msg: "Transfer initialise! Send the receiver the transfer key to finalise." }))
    dispatch(removeCoins(1))
  }

  return (
    <div className="container">
      <SendModal
        {...openSendModal}
        onClose={() => setOpenSendModal({ show: false })}
        onConfirm={handleConfirm}
      />
      <div className="Body sendStatecoin">
        <div className="swap-header">
          <h2 className="WalletAmount">
            <img src={arrow} alt="arrow" />
                      Send StateCoins
                  </h2>
          <div>
            <Link className="nav-link" to="/home">
              <StdButton
                label="Back"
                className="Body-button transparent" />
            </Link>
          </div>
        </div>
        <h3 className="subtitle">
          <b> {fromSatoshi(balance_info.total_balance)} BTC</b> available as <b>{balance_info.num_coins}</b> Statecoins
              </h3>
      </div>

      <div className="sendStatecoin content">
        <div className="Body left ">
          <div>
            <h3 className="subtitle">Select statecoin to send</h3>
            <span className="sub">Click to select coins below</span>
            <CoinsList
              displayDetailsOnClick={false}
              showCoinStatus={true}
              selectedCoins={selectedCoins}
              setSelectedCoin={addSelectedCoin}
              setCoinDetails={setCoinDetails}
              refresh={refreshCoins}
              render = {forceRender}
              send={true} />
          </div>

        </div>
        <div className="Body right">
          <div className="header">
            <h3 className="subtitle">Transaction Details</h3>
          </div>
          <div>
            <AddressInput
              inputAddr={inputAddr}
              onChange={onInputAddrChange}
              placeholder='Send to destination address'
              smallTxtMsg='Statechain Address' />
          </div>
          <div>
            {/* -- NOT implemented at this stage
                      <p className="table-title">Use Only:</p>
                      <table>
                          <tbody>
                          <tr>
                              <td>
                                  <input
                                      name="isGoing"
                                      type="checkbox"
                                      className="checkbox"
                                      />
                              </td>
                              <td>
                                  <img src={orange} alt="walletIcon"/>
                                  <span>UTXO’s with a High Privacy Score <br/> Balance: <b>0.55 BTC</b></span>
                              </td>
                          </tr>
                          </tbody>
                      </table>
                      */}

            <ConfirmPopup onOk={sendButtonCheck} preCheck={checkSend} argsCheck={[dispatch, inputAddr]}>
              <button type="action-btn-normal" className={`btn send-action-button ${loading} ${ (selectedCoins.length > 1 && !(inputAddr.substring(0,4) === 'xpub' || inputAddr.substring(0,4) === 'tpub'))?("privacy"): (null)  }`} >
                {loading ? (<Loading />) : "SEND STATECOIN"}
              </button>
            </ConfirmPopup >
          </div>
        </div>
      </div>

      {/* <div className="Body transferMsg">
            <h3 className="subtitle">Transfer Message:</h3>
            <div className="transferMsg scan-trasfermsg">
              <CopiedButton style={{left: 0, top: -7 }} handleCopy={copyTransferMsgToClipboard}>
                <img type="button" src={icon2} alt="icon" />
              </CopiedButton>
                <span>
                  {transferMsg3}
                </span>
            </div>
          </div> */}
    </div>
  )
}

export default withRouter(SendStatecoinPage);
