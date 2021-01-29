import orange from "../../images/wallet-orange.png";
import arrow from "../../images/arrow-up.png"
import icon2 from "../../images/icon2.png";

import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux'

import { Coins, Quantity, StdButton } from "../../components";
import { fromSatoshi } from '../../wallet/util'
import { decodeSCEAddress, encodeMessage } from '../../wallet/util'
import { callTransferSender } from '../../features/WalletDataSlice'

import './Send.css';

const SendStatecoinPage = () => {
  const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id
  const [inputAddr, setInputAddr] = useState('');
  const [transferMsg3, setTransferMsg3] = useState("null");

  const total_balance = useSelector(state => state.walletData).total_balance;
  const num_statecoins = useSelector(state => state.walletData).coins_data.length;
  const transfer_msg3_promise = useSelector(state => state.walletData).transfer_msg3;
  transfer_msg3_promise.then((transfer_msg3) => {
    setTransferMsg3(encodeMessage(transfer_msg3))
  })

  const onInputAddrChange = (event) => {
    setInputAddr(event.target.value);
  };


  const dispatch = useDispatch();
  const sendButtonAction = async () => {
    // check statechain is chosen
    if (!selectedCoin) {
      alert("Please choose a StateCoin to send.");
      return
    }
    if (!inputAddr) {
      alert("Please enter an StateCoin address to send to.");
      return
    }

    var input_pubkey = "";

    try {
      input_pubkey = decodeSCEAddress(inputAddr);
    } catch (e) {
      alert("Error: " + e.message);
      return
    }

    if (!(input_pubkey.slice(0,2) === '02' || input_pubkey.slice(0,2) === '03')) {
      alert("Error: invalid proof public key");
      return
    }

    if (input_pubkey.length !== 66) {
      alert("Error: invalid proof public key");
      return
    }

    dispatch(callTransferSender({"shared_key_id": selectedCoin, "rec_addr": input_pubkey}))

  }

  const copyTransferMsgToClipboard = () => {
    navigator.clipboard.writeText(transferMsg3);
  }

  return (
      <div className="container ">
          <div className="Body sendStatecoin">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={arrow} alt="arrow"/>
                      Send StateCoins
                  </h2>
                  <div>
                      <Link className="nav-link" to="/">
                          <StdButton
                              label="Back"
                              className="Body-button transparent"/>
                      </Link>
                  </div>
              </div>
              <h3 className="subtitle">
                 <b> {fromSatoshi(total_balance)} BTC</b> available as <b>{num_statecoins}</b> Statecoins
              </h3>
          </div>

          <div className="sendStatecoin content">
              <div className="Body left ">
                  <div>
                      <h3 className="subtitle">Select StateCoin UTXO’s to Send</h3>
                      <span className="sub">Click to select UTXO’s below</span>
                      <Coins
                        displayDetailsOnClick={false}
                        selectedCoin={selectedCoin}
                        setSelectedCoin={setSelectedCoin}/>
                  </div>

              </div>
              <div className="Body right">
                  <div className="header">
                      <h3 className="subtitle">Transaction Details</h3>
                  </div>
                  <div>
                     <div className="inputs">
                         <input
                          type="text"
                          placeholder="Destination Address"
                          onChange={onInputAddrChange}/>

                         <span className="smalltxt">Recipients Statechain Address</span>
                     </div>
                  </div>
                  <div>
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
                      <button type="button" className="btn" onClick={sendButtonAction}>
                          SEND STATECOIN UTXO’S
                      </button>
                  </div>
              </div>
          </div>

            <div className="Body transferMsg">
                <h3 className="subtitle">Transfer Message:</h3>
                <div className="transferMsg scan-trasfermsg">
                  <img type="button" src={icon2} alt="icon" onClick={copyTransferMsgToClipboard}/>
                    <span>
                      {transferMsg3}
                    </span>
                </div>

        </div>
      </div>
    )
}

export default withRouter(SendStatecoinPage);
