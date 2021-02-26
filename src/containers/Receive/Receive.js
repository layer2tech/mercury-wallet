import arrow from "../../images/arrow-up.png"
import icon2 from "../../images/icon2.png";

import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux'

import { StdButton, AddressInput } from "../../components";

import { callGenSeAddr, callTransferReceiver, setError, setNotification } from '../../features/WalletDataSlice'

import './Receive.css';
import '../Send/Send.css';


const ReceiveStatecoinPage = () => {
  const dispatch = useDispatch();

  const rec_se_addr = useSelector(state => state.walletData).rec_se_addr;

  const [transfer_msg3, setTransferMsg3] = useState("");

  const onTransferMsg3Change = (event) => {
    setTransferMsg3(event.target.value);
  };

  const genAddrButtonAction = async () => {
    dispatch(callGenSeAddr())
  }

  const receiveButtonAction =() => {
    // check statechain is chosen
    if (!transfer_msg3) {
      dispatch(setError({msg: "Paste TransferMsg3 to perform transfer receiver."}))
      return
    }

    dispatch(callTransferReceiver(transfer_msg3)).then((res) => {
      if (res.error===undefined) {
        setTransferMsg3("")
        dispatch(setNotification({msg:"Transfer complete!"}))
      }
    })

  }

  const copySEAddressToClipboard = () => {
    navigator.clipboard.writeText(rec_se_addr);
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
                Use your address below to receive Statecoins
            </h3>
        </div>

        <div className="receiveStatecoin content">
            <div className="Body">
                <div className="receiveStatecoin-scan">
                    {/*
                    <img src={scan} alt="image"/>
                    */}
                    <div className="receiveStatecoin-scan-content">
                        <div className="receiveStatecoin-scan-txid">
                          <img type="button" src={icon2} alt="icon" onClick={copySEAddressToClipboard}/>
                            <span>
                              {rec_se_addr}
                            </span>
                        </div>
                        <span
                          className="receiveStatecoin-scan-ft-txt"
                          onClick={genAddrButtonAction}>
                            GENERATE ANOTHER ADDRESS
                        </span>
                    </div>
                </div>
            </div>

        </div>

        <div className="sendStatecoin content">
            <div className="Body center">
                <div>
                    <AddressInput
                      inputAddr={transfer_msg3}
                      onChange={onTransferMsg3Change}
                      placeholder='msg'
                      smallTxtMsg='TransferMsg3'/>
                </div>
                <div>

                    <button type="button" className="btn" onClick={receiveButtonAction}>
                        PERFORM TRANSFER RECEIVER
                    </button>
                </div>
                </div>
            </div>
    </div>
  )
}

export default withRouter(ReceiveStatecoinPage);
