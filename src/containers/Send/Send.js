import React, {useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useSelector, useDispatch} from 'react-redux'

import {Coins, StdButton, AddressInput, CopiedButton, SendModal} from "../../components";
import {fromSatoshi} from '../../wallet/util'
import {decodeSCEAddress, encodeMessage} from '../../wallet/util'
import {isWalletLoaded, callTransferSender, setError, setNotification} from '../../features/WalletDataSlice'

import orange from "../../images/wallet-orange.png";
import arrow from "../../images/arrow-up.png"
import icon2 from "../../images/icon2.png";
import './Send.css';

const SendStatecoinPage = () => {
  const dispatch = useDispatch();
  const balance_info = useSelector(state => state.walletData).balance_info;
  const [openSendModal, setOpenSendModal] = useState({ show: false });

  const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id
  const [coinDetails, setCoinDetails] = useState({}); // store selected coins shared_key_id
  const [inputAddr, setInputAddr] = useState("");
  const onInputAddrChange = (event) => {
    setInputAddr(event.target.value);
  };
  const [transferMsg3, setTransferMsg3] = useState('');
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
 }

  const sendButtonAction = async () => {
    // check statechain is chosen
    if (!selectedCoin) {
      dispatch(setError({msg: "Please choose a StateCoin to send."}))
      return
    }
    if (!inputAddr) {
      dispatch(setError({msg: "Please enter an StateCoin address to send to."}))
      return
    }

    var input_pubkey = "";

    try {
      input_pubkey = decodeSCEAddress(inputAddr);
    } catch (e) {
      dispatch(setError({msg: "Error: " + e.message}))
      return
    }

    if (!(input_pubkey.slice(0,2) === '02' || input_pubkey.slice(0,2) === '03')) {
      dispatch(setError({msg: "Error: invalid proof public key."}));
      return
    }

    if (input_pubkey.length !== 66) {
      dispatch(setError({msg: "Error: invalid proof public key"}))
      return
    }

    dispatch(callTransferSender({"shared_key_id": selectedCoin, "rec_addr": input_pubkey}))
    .then(res => {
      if (res.error===undefined) {
        const transferCode = encodeMessage(res.payload);
        setTransferMsg3(transferCode)
        setOpenSendModal({
          show: true,
          value: coinDetails.value,
          transfer_code: transferCode,
          coinAddress: inputAddr
        });
      }
    })
  }

  const copyTransferMsgToClipboard = () => {
    navigator.clipboard.writeText(transferMsg3);
  }

  const handleConfirm = (pass) => {
    alert('Handle confirm transaction');
    // Do something with passphrase
    console.log(pass);
    setInputAddr("")
    setSelectedCoin('')
    setRefreshCoins((prevState) => !prevState);
    setOpenSendModal({ show: false })
    setCoinDetails({})
    dispatch(setNotification({msg:"Transfer initialise! Send the receiver the transfer message to finalise."}))
  }

  return (
      <div className="container">
        <SendModal 
          {...openSendModal} 
          onClose={() => setOpenSendModal({show: false})} 
          onConfirm={handleConfirm}
        />
          <div className="Body sendStatecoin">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={arrow} alt="arrow"/>
                      Send StateCoins
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
                 <b> {fromSatoshi(balance_info.total_balance)} BTC</b> available as <b>{balance_info.num_coins}</b> Statecoins
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
                        setSelectedCoin={setSelectedCoin}
                        setCoinDetails={setCoinDetails}
                        refresh={refreshCoins}/>
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
                       smallTxtMsg='Statechain Address'/>
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
              <CopiedButton style={{left: 0, top: -7 }} handleCopy={copyTransferMsgToClipboard}>
                <img type="button" src={icon2} alt="icon" />
              </CopiedButton>
                <span>
                  {transferMsg3}
                </span>
            </div>
          </div>

      </div>
    )
}

export default withRouter(SendStatecoinPage);
