import walletIcon from '../../images/walletIcon.png';
import withdrowIcon from "../../images/withdrow-icon.png";
import icon2 from "../../images/icon2.png";

import {Link, withRouter, Redirect} from "react-router-dom";
import React, {useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';



import {isWalletLoaded, callWithdraw, callGetFeeEstimation, setError, setNotification, callGetConfig, callSumStatecoinValues, callIsBatchMixedPrivacy, callGetStateCoin} from '../../features/WalletDataSlice';

import { StdButton, AddressInput, Tutorial, CopiedButton, ConfirmPopup, CoinsList} from "../../components";
import {FILTER_BY_OPTION} from "../../components/panelControl/panelControl"
import {fromSatoshi, toSatoshi} from '../../wallet/util';
import {Modal, Spinner} from 'react-bootstrap';

import Loading from '../../components/Loading/Loading';

import './Withdraw.css';

import { STATECOIN_STATUS } from '../../wallet';
const WithdrawPage = () => {
  const dispatch = useDispatch();

  const { balance_info, filterBy } = useSelector(state => state.walletData);

  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [withdrawingWarning, setWithdrawingWarning] = useState(false)

  const [inputAddr, setInputAddr] = useState("");

  const [loading, setLoading] = useState(false);
  const [withdraw_txid,setWithdrawTxid] = useState("");

  const [openModal,setOpenModal] = useState(false);
  
  const [forceRender, setRender]  =  useState({});
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render

  const [txFeePerB, setTxFeePerB] = useState(7); // chosen fee per kb value

  const [txFees,setTxFees] = useState([{block: 6, fee: 7,id:1},{block: 3, fee:8,id:2},{block:1, fee:9,id:3}])

  const [customFee,setCustomFee] = useState(false)
  
  const onInputAddrChange = (event) => {
    setInputAddr(event.target.value);
  };

  const addSelectedCoin = (statechain_id) => {
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
    
    let checkWithdrawing = false

    selectedCoins.map( id => {
      // Checks if a selected coin is in withdrawing state for change in confirmation msg
      if(callGetStateCoin(id).status === STATECOIN_STATUS.WITHDRAWING){
        checkWithdrawing = true
      }
    })

    if(checkWithdrawing){
      setWithdrawingWarning(true)
    }else{
      setWithdrawingWarning(false)
    }

    setRender({});
  }

  // Get Tx fee estimate
  useEffect(() => {
    let isMounted = true
    let blocks = txFees.map(item => item.block)
    // list of # of blocks untill confirmation

    let txFeeEstimations = []

    blocks.map(block => {
      dispatch(callGetFeeEstimation(parseInt(block))).then(tx_fee_estimate => {
        if ( isMounted === true ) {
          if (tx_fee_estimate.payload > 0) {
            // Add fee to list
            let feeEst = tx_fee_estimate.payload
          
            txFeeEstimations = [...txFeeEstimations,
            { block: block, fee: feeEst, id: (txFeeEstimations.length + 1) }]

            if (parseInt(block) === 6) setTxFeePerB(Math.ceil(feeEst))
          }

          if (txFeeEstimations.length === 3) {
            //Initial Tx Fee estimations set
            setTxFees(txFeeEstimations)
          }
        }
      })
    })
    return () => {isMounted = false}
  }, [dispatch]);

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }


  const withdrawButtonAction = async () => {

    setLoading(true)
    setOpenModal(true)
    dispatch(callWithdraw({"shared_key_ids": selectedCoins, "rec_addr": inputAddr, "fee_per_byte": txFeePerB})).then((res => {
      if (res.error === undefined) {
        setSelectedCoins([])
          setInputAddr("")  
          setRefreshCoins((prevState) => !prevState);
          console.log(res)
          setWithdrawTxid(res.payload)
          dispatch(setNotification({msg:"Withdraw to "+inputAddr+" - transaction broadcast complete."}))
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
    if(event.target.value === "custom"){
      setCustomFee(true)
    }
    
    else setTxFeePerB(parseInt(event.target.value))
  }

  const handleKeyPress = (e) => {
    if( e.key.charCodeAt(0) === 69 ){
      // Add value to txFee list
      // set Tx fee per B
      // reset customFee
      setTxFees([...txFees,
        {block: "custom", fee : txFeePerB,id: (txFees.length+1)}])
      setCustomFee(false)
      return
    }
    if( e.key.charCodeAt(0) < 48 || e.key.charCodeAt(0) > 57  ){
      e.preventDefault();
    }
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
              <div className = "loading-spinner"  ><Spinner animation="border" style = {{color: "var(--primary)"}} variant="primary" ></Spinner></div>
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
                  Send statecoins to a Bitcoin address<br/>
                <b> {fromSatoshi(balance_info.total_balance)} BTC</b> as <b>{balance_info.num_coins}</b> {filterByMsg()}
              </h3>
          </div>

          <div className="withdraw content">
              <div className="Body left ">
                  <div>
                      <h3 className="subtitle">Select statecoins to withdraw</h3>
                      <span className="sub">Click to select coins below</span>
                      <CoinsList
                        showCoinStatus={true}
                        displayDetailsOnClick={false}
                        selectedCoins={selectedCoins}
                        setSelectedCoin = {addSelectedCoin}
                        refresh = {refreshCoins}
                        render = {forceRender}
                        withdraw/>
                    </div>

              </div>
              <div className="Body right">
                  <div className="header">
                      <h3 className="subtitle">Transaction Details</h3>
                      <div>
                        {
                          !customFee ? (
                          <select
                            onChange={handleFeeSelection}
                            value={txFeePerB}>
                            {txFees.map(feeObj => {
                              let fee = Math.ceil(feeObj.fee)
                              //Round up fee to nearest Satoshi
                              return (
                              <option value = {fee} key = {feeObj.id}>
                                {feeObj.block === 6  ? ("Low "):
                                  (feeObj.block === 3 ? ("Med "):
                                  (feeObj.block === 1 ? ("High ") : (null)))}
                                {fee} sat/B
                              </option>)
                            })}
                            <option value={"custom"}>Custom...</option>
                          </select>
                          )
                          :
                          (
                            <input 
                              placeholder = "Enter value..." 
                              type = "text" 
                              onKeyPress={handleKeyPress}
                              onChange={handleFeeSelection}/>
                          )
                        }

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

                      <ConfirmPopup preCheck={checkWithdrawal} argsCheck={[dispatch, selectedCoins, inputAddr]} onOk = {withdrawButtonAction} >
                        <button type="button" className={`btn withdraw-button ${loading} ${withdrawingWarning ? ("withdrawing-warning") : (null)}`} >
                            {loading?(null):(<img src={withdrowIcon} alt="withdrowIcon"/>)}
                            {loading?(<Loading/>):("Withdraw btc")}</button>
                      </ConfirmPopup>
                  </div>
              </div>
          </div>
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}


export default withRouter(WithdrawPage);
