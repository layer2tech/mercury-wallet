'use strict';
import walletIcon from '../../images/walletIcon.png';
import withdrowIcon from "../../images/withdrow-icon.png";
import { withRouter, Redirect} from "react-router-dom";
import {useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';



import {isWalletLoaded,
  callGetFeeEstimation,
  callGetConfig,
  setShowWithdrawPopup,
  setWithdrawTxid,
  checkChannelWithdrawal
} from '../../features/WalletDataSlice';

import { AddressInput, Tutorial, ConfirmPopup } from "../../components";

import './WithdrawLightning.css';
import PageHeader from '../PageHeader/PageHeader';
import ItemsContainer from "../../components/ItemsContainer/ItemsContainer";

const WithdrawLightning = () => {

    const dispatch = useDispatch();
  
    const [inputAddr, setInputAddr] = useState("");

    const [loading, setLoading] = useState(false);

    const [forceRender, setRender]  =  useState({});
    const [refreshChannels, setRefreshChannels] = useState(false);

    const [selectedChannels, setSelectedChannels] = useState([]);

    const [withdrawingWarning, setWithdrawingWarning] = useState(false);
  
    const [txFeePerB, setTxFeePerB] = useState(7); // chosen fee per kb value
  
    const [txFees,setTxFees] = useState([{block: 6, fee: 7,id:1},{block: 3, fee:8,id:2},{block:1, fee:9,id:3}])
  
    const [customFee,setCustomFee] = useState(false)
    
    const onInputAddrChange = (event) => {
      setInputAddr(event.target.value);
    };

    const addSelectedChannel = (channel_id) => {
      if(loading) return
      // Stop channels removing if clicked while pending transaction
      
      let newSelectedChannels = selectedChannels;
      const isChannelId = (element) => element === channel_id;
      let index = newSelectedChannels.findIndex(isChannelId);
      if (index !== -1){
        newSelectedChannels.splice(index,1);
      } else {
        newSelectedChannels.push(channel_id);
      }
      setSelectedChannels(newSelectedChannels);
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
      setLoading(true);
      setRefreshChannels((prevState) => !prevState);
      dispatch(setShowWithdrawPopup(true));
      dispatch(setWithdrawTxid("wzxykmopq123456"));
      // setLoading(false);
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

  
    let current_config;
    try {
      current_config = callGetConfig();
    } catch(error) {
      console.warn('Can not get config', error)
    }

  return (
    <div className={`${current_config?.tutorials ? 'container-with-tutorials' : ''}`}>

      <div className="container">

          <PageHeader 
            title = "Close Channel BTC"
            className = "close-channel"
            icon = {walletIcon}
            subTitle = "Create new lightning channels" />

          <div className="withdraw content">
              <ItemsContainer 
                channelListProps={{
                  title: "Select channel to withdraw",
                  selectedChannels: selectedChannels,
                  addSelectedChannel: addSelectedChannel,
                  refreshChannels: refreshChannels,
                  forceRender: forceRender
                }}
              />

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
                  <ConfirmPopup preCheck={checkChannelWithdrawal} argsCheck={[dispatch, selectedChannels, inputAddr]} onOk = {withdrawButtonAction} >
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


export default withRouter(WithdrawLightning);
