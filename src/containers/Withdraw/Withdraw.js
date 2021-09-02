import walletIcon from '../../images/walletIcon.png';
import withdrowIcon from "../../images/withdrow-icon.png";
import icon2 from "../../images/icon2.png";

import {Link, withRouter, Redirect} from "react-router-dom";
import React, {useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {isWalletLoaded, callWithdraw, callGetFeeEstimation, setError, setNotification, callGetConfig} from '../../features/WalletDataSlice';
import {Coins, StdButton, AddressInput, Tutorial, CopiedButton} from "../../components";
import {FILTER_BY_OPTION} from "../../components/panelControl/panelControl"
import {fromSatoshi, toSatoshi} from '../../wallet/util';
import {Modal, Spinner} from 'react-bootstrap';

import Loading from '../../components/Loading/Loading';

import './Withdraw.css';

export const DEFAULT_FEE = 0.00001;

const WithdrawPage = () => {
  const dispatch = useDispatch();
  const { balance_info, filterBy } = useSelector(state => state.walletData);

  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [inputAddr, setInputAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [withdraw_txid,setWithdrawTxid] = useState("")
  const [openModal,setOpenModal] = useState(false)

  const onInputAddrChange = (event) => {
    setInputAddr(event.target.value);
  };
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render
  const [txFeePerKB, setTxFeePerKB] = useState(DEFAULT_FEE); // chosen fee per kb value
  // Calc Med and High fee values and convert to satoshis
  const calcTxFeePerKbList = (low_fee_value) => {
    if (low_fee_value<0.0001) { // < 10 satoshis per byte
      return [low_fee_value, low_fee_value*2, low_fee_value*4]
    }
    return [low_fee_value, low_fee_value*1.1, low_fee_value*1.2]
  }

  const txFeePerByteList = calcTxFeePerKbList(DEFAULT_FEE); // list of fee per kb options in satoshis

  const addSelectedCoin = (statechain_id) => {
    setSelectedCoins( prevSelectedCoins => {
      let newSelectedCoins = prevSelectedCoins;
      const isStatechainId = (element) => element === statechain_id;
      let index = newSelectedCoins.findIndex(isStatechainId);
      if (index !== -1){
        newSelectedCoins.splice(index,1);
      } else {
        newSelectedCoins.push(statechain_id);
      }
      return newSelectedCoins;
    });
  }

  // Get Tx fee estimate
  useEffect(() => {
    dispatch(callGetFeeEstimation()).then(tx_fee_estimate => {
      if (tx_fee_estimate>0) {
        setTxFeePerKB(tx_fee_estimate);
      }
    })
  }, [dispatch]);

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const withdrawButtonAction = async () => {
    // check statechain is chosen
    if (selectedCoins.length === 0) {
      dispatch(setError({msg: "Please choose a StateCoin to withdraw."}))
      return
    }
    if (!inputAddr) {
      dispatch(setError({msg: "Please enter an address to withdraw to."}))
      return
    }

    setLoading(true)
    setOpenModal(true)
    dispatch(callWithdraw({"shared_key_ids": selectedCoins, "rec_addr": inputAddr, "fee_per_kb": txFeePerKB})).then((res => {
        if (res.error===undefined) {
          setSelectedCoins([])
          setInputAddr("")
          setRefreshCoins((prevState) => !prevState);
          console.log(res)
          setWithdrawTxid(res.payload)
          dispatch(setNotification({msg:"Withdraw to "+inputAddr+" Complete!"}))
        }
        if(res.error!== undefined){
          setOpenModal(false)
        }
        setLoading(false)
    }))
    
  }

  const filterByMsg = () => {
    let return_str = "Statecoin";
    if (balance_info.num_coins > 1) {
      return_str = return_str+"s"
    }
    switch (filterBy) {
      case FILTER_BY_OPTION[0].value:
        return return_str+ " available in Wallet";
      case FILTER_BY_OPTION[1].value:
        return return_str+ " already withdrawn";
      case FILTER_BY_OPTION[2].value:
        return return_str+ " in transfer process";
      default:
        return;
    }
  }

  const handleFeeSelection = (event) => {
    setTxFeePerKB(event.target.value)
  }

  const handleClose = () => {
    setOpenModal(!openModal)
  }

  const copyTxIDToClipboard = () => {
    navigator.clipboard.writeText(withdraw_txid);
  }

  let current_config;
  try {
    current_config = callGetConfig();
  } catch(error) {
    console.warn('Can not get config', error)
  }

  return (
    <div className={`${current_config?.tutorials ? 'container-with-tutorials' : ''}`}>

      <Modal show ={openModal} onHide = {() => setOpenModal(!openModal)} className={"withdraw-modal"}>
        <Modal.Body className={"modal-body"}>
          
          {withdraw_txid === "" ? (
            <div className = "loading-container">
              <div className = "loading-spinner"  ><Spinner animation="border" style = {{color: "#0054F4"}} variant="primary" ></Spinner></div>
              <div className = "loading-txt" >Loading Withdrawal Transaction ID...</div>
            </div>  
          ):(
          <div>
            <div className={"withdrawal-confirm"}>
              <h3>Withdrawal confirmation.</h3>
              <div className={"txid-container"}>
                <span>TX ID: </span>
                <CopiedButton handleCopy={() => copyTxIDToClipboard()}>
                  <div className="copy-hex-wrap">
                    <img type="button" src={icon2} alt="icon"/>
                    <span>
                      {withdraw_txid}
                    </span>
                  </div>
                </CopiedButton>
              </div>
            </div>
            <button onClick={() => handleClose()}
              className={`confirm-btn`}
            >
              Continue
            </button>
          </div>)}
          
        </Modal.Body>
      </Modal>

      <div className="container">
          <div className="Body withdraw">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={walletIcon} alt="walletIcon"/>
                      Withdraw Statecoins
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
                  Withdraw Statecoin UTXO’s back to Bitcoin. <br/>
                <b> {fromSatoshi(balance_info.total_balance)} BTC</b> as <b>{balance_info.num_coins}</b> {filterByMsg()}
              </h3>
          </div>

          <div className="withdraw content">
              <div className="Body left ">
                  <div>
                      <h3 className="subtitle">Select Statecoin UTXO’s to withdraw</h3>
                      <span className="sub">Click to select UTXO’s below</span>
                      <Coins
                        showCoinStatus={true}
                        displayDetailsOnClick={false}
                        selectedCoins={selectedCoins}
                        setSelectedCoin={addSelectedCoin}
                        refresh={refreshCoins}
                        withdraw/>
                    </div>

              </div>
              <div className="Body right">
                  <div className="header">
                      <h3 className="subtitle">Transaction Details</h3>
                      <div>
                          <select
                            onChange={handleFeeSelection}
                            value={txFeePerKB}
                          >
                          <option value={txFeePerByteList[0]}>Low {toSatoshi(txFeePerByteList[0]/1000)} sat/B</option>
                          <option value={txFeePerByteList[1]}>Med {toSatoshi(txFeePerByteList[1]/1000)} sat/B</option>
                          <option value={txFeePerByteList[2]}>High {toSatoshi(txFeePerByteList[2]/1000)} sat/B</option>
                          </select>
                          <span className="small">Transaction Fee</span>
                      </div>
                  </div>

                  <div>
                      <AddressInput
                        inputAddr={inputAddr}
                        onChange={onInputAddrChange}
                        placeholder='Destination Address for withdrawal'
                        smallTxtMsg='Your Bitcoin Address'/>
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
                      <button type="button" className="btn" onClick={loading?(null):(withdrawButtonAction)}>
                          {loading?(null):(<img src={withdrowIcon} alt="withdrowIcon"/>)}
                          {loading?(<Loading/>):("Withdraw btc")}</button>
                  </div>
              </div>
          </div>
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}


export default withRouter(WithdrawPage);
