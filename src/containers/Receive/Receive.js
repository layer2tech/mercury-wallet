import React, {useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {StdButton, AddressInput, CopiedButton} from "../../components";
import QRCode from 'qrcode.react';

import {isWalletLoaded, callNewSeAddr, callGetSeAddr, callTransferReceiver, setError, setNotification} from '../../features/WalletDataSlice'
import {fromSatoshi} from '../../wallet'

import arrow from "../../images/arrow-up.png"
import icon2 from "../../images/icon2.png";
import './Receive.css';
import '../Send/Send.css';

import { Transaction } from 'bitcoinjs-lib';

const ReceiveStatecoinPage = () => {
  const dispatch = useDispatch();

  const [transfer_msg3, setTransferMsg3] = useState("");
  const onTransferMsg3Change = (event) => {
    setTransferMsg3(event.target.value);
  };
  const [rec_sce_addr, setRecAddr] = useState(callGetSeAddr());

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const genAddrButtonAction = async () => {
    callNewSeAddr()
    setRecAddr(callGetSeAddr())
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
        let amount = res.payload.state_chain_data.amount
        let locktime = Transaction.fromHex(res.payload.tx_backup_psm.tx_hex).locktime
        dispatch(setNotification({msg:"Transfer of "+fromSatoshi(amount)+" BTC complete! StateCoin expires at block height "+locktime+"."}))
      }
    })
  }

  const copySEAddressToClipboard = () => {
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
                Use your address below to receive Statecoins
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
                      <div>
                        <img type="button" src={icon2} alt="icon"/>
                        <span>
                          {rec_sce_addr}
                        </span>
                      </div>
                    </CopiedButton>
                  </div>
                  <button
                    type="button"
                    className="Body-button transparent"
                    onClick={genAddrButtonAction}>
                      GENERATE ANOTHER ADDRESS
                  </button>
              </div>
            </div>
          </div>
        </div>

        <div className="receiveStatecoin sendStatecoin content">
          <div className="Body center">
            <p className="receive-note">Enter Transfer Code to complete the transfer</p>
            <div className="receive-bottom">
              <AddressInput
                inputAddr={transfer_msg3}
                onChange={onTransferMsg3Change}
                placeholder='Generated and provided by Sender'
                smallTxtMsg='Transfer Code'/>
              <button type="button" className={`btn ${transfer_msg3 ? 'active': ''}`} onClick={receiveButtonAction}>
                RECEIVE TRANSFER
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}

export default withRouter(ReceiveStatecoinPage);
