/* eslint-disable jsx-a11y/anchor-is-valid */
import anon_icon_none from "../../images/table-icon-grey.png";
import anon_icon_low from "../../images/table-icon-medium.png";
import anon_icon_high from "../../images/table-icon.png";
import anon_icon2_none from "../../images/close-grey.png";
import anon_icon2_low from "../../images/question-mark.png";
import anon_icon2_high from "../../images/check-grey.png";
import utx from "../../images/utxo_id.png";
import time from "../../images/time_left.png";
import calendar from "../../images/calendar.png";
import swapNumber from "../../images/swap-number.png";
import walleticon from "../../images/walletIcon.png";
import txidIcon from "../../images/txid-icon.png";
import scAddrIcon from "../../images/sc_address_logo.png";
import copy_img from "../../images/icon2.png";
import descripIcon from "../../images/description.png";
import hashIcon from "../../images/hashtag.png";
import hexIcon from "../../images/hexagon.png";
import icon2 from "../../images/icon2.png"
import React, {useState, useEffect, useCallback } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {Button, Modal, Spinner} from 'react-bootstrap';
import {useDispatch, useSelector} from 'react-redux';
import Moment from 'react-moment';
import { fromSatoshi } from '../../wallet/util';
import {
  callRemoveCoin,
  callGetUnspentStatecoins, 
  callGetBlockHeight, 
  updateBalanceInfo, 
  callGetUnconfirmedStatecoinsDisplayData,
  callGetUnconfirmedAndUnmindeCoinsFundingTxData, 
  setError,
  callAddDescription,
  callGetConfig,
  callGetStateCoin,
  callGetActivityLogItems,
  addSwapPendingCoin,
  removeSwapPendingCoin,
  handleEndAutoSwap,
  setIntervalIfOnline} from '../../features/WalletDataSlice';
import SortBy from './SortBy/SortBy';
import FilterBy from './FilterBy/FilterBy';
import { STATECOIN_STATUS } from '../../wallet/statecoin';
import { CoinStatus } from '..';
import EmptyCoinDisplay from './EmptyCoinDisplay/EmptyCoinDisplay';
import CopiedButton from "../CopiedButton";
import QRCodeGenerator from "../QRCodeGenerator/QRCodeGenerator";
import SwapStatus from "./SwapStatus/SwapStatus";
import './coins.css';
import '../index.css';
import CoinDescription from "../inputs/CoinDescription/CoinDescription";
import './DeleteCoin/DeleteCoin.css'
import {defaultWalletConfig} from '../../containers/Settings/Settings'

import {
  setNotification,
  callDoSwap,
  addCoinToSwapRecords,
  removeCoinFromSwapRecords
} from "../../features/WalletDataSlice";
import { SWAP_STATUS } from "../../wallet/swap/swap_utils";
import Coin from "./Coin/Coin";


const TESTING_MODE = require("../../settings.json").testing_mode;

const DEFAULT_STATE_COIN_DETAILS = {show: false, coin: {value: 0, expiry_data: {blocks: "", months: "", days: ""}, privacy_data: {score_desc: ""},tx_hex: null,withdraw_tx: null}}
// privacy score considered "low"
const LOW_PRIVACY = 2
// style time left timer as red after this many days
export const DAYS_WARNING = 5

const INITIAL_COINS = {
    unspentCoins: [],
    unConfirmedCoins: []
}

const INITIAL_SORT_BY = {
  direction: 0,
  by: 'value'
};

export const SWAP_STATUS_INFO = {
  Phase0: "Phase 0/8: registration",
  Phase1: "Phase 1/8: awaiting swap commitments",
  Phase2: "Phase 2/8: awaiting blind token",
  Phase3: "Phase 3/8: new Tor circuit",
  Phase4: "Phase 4/8: awaiting transfer address",
  Phase5: "Phase 5/8: transferring statecoin",
  Phase6: "Phase 6/8: receiving new statecoin",
  Phase7: "Phase 7/8: finalizing transfers",
  Phase8: "Phase 8/8: completing swap",
  End: "End",
}

const CoinsList = (props) => {
    const [state, setState] = useState({});
    
    const {selectedCoins, isMainPage, swap} = props;
    const dispatch = useDispatch();
    const { filterBy, swapPendingCoins, coinsAdded, coinsRemoved, torInfo} = useSelector(state => state.walletData);
    const [sortCoin, setSortCoin] = useState(INITIAL_SORT_BY);
    const [coins, setCoins] = useState(INITIAL_COINS);
    const [initCoins, setInitCoins] = useState({});
    const [showCoinDetails, setShowCoinDetails] = useState(DEFAULT_STATE_COIN_DETAILS);  // Display details of Coin in Modal
    //const [refreshCoins, setRefreshCoins] = useState(false);
    
    const [description,setDescription] = useState("");
    const [dscpnConfirm,setDscrpnConfirm] = useState(false);

    //const [swapStatus,setSwapStatus] = useState("");

    // deleting coins
    const [currentItem, setCurrentItem] = useState(null);
    const [showDeleteCoinDetails, setShowDeleteCoinDetails] = useState(false);

    let all_coins_data = [...coins.unspentCoins, ...coins.unConfirmedCoins];

    let current_config;
    try {
      current_config = callGetConfig();
    } catch {
      current_config = defaultWalletConfig()
    }
    const handleCloseCoinDetails = () => {
      if(!(selectedCoins.length > 0)){
        // do not reset the selected coins if we already have selected coins
        props.setSelectedCoins([]);
      }
      setShowCoinDetails(DEFAULT_STATE_COIN_DETAILS);
    }

    const filterCoinsByStatus = (coins = [], status) => {
      return coins.filter(coin => coin.status === status);
    }

    const validExpiryTime = (expiry_data) => {
      let block_height = callGetBlockHeight()

      if(block_height === 0 || expiry_data.block === 0 || !block_height){
        // set its actual block to 0 so next time we can return  '--' until an actual block is received
        expiry_data.blocks = 0;
        return false;
      }

      if(expiry_data === -1){
        return false
      }
      
      return true;
    }

    const displayExpiryTime = (expiry_data, show_days=false) => {
      if(validExpiryTime(expiry_data)){
        if(show_days && (expiry_data.days % 30) > 0){
          return expiry_time_to_string(expiry_data) + " and " + getRemainingDays(expiry_data.days);
        }else{
          return expiry_time_to_string(expiry_data);
        }
      }
      return  '--';
    }

    const getRemainingDays = (numberOfDays) => {
      let days = Math.floor(numberOfDays % 365 % 30);
      let daysDisplay = days > 0 ? days + (days === 1 ? " day" : " days") : "";
      return daysDisplay; 
    }

    const getAddress = (shared_key_id) => {
      let coin = initCoins.filter(coin => coin.shared_key_id === shared_key_id)
      if (coin != undefined) {
        if (coin[0]){
          return coin[0].p_addr
        }
      }
      return null
    } 


    // Convert expiry_data to string displaying months or days left
    const expiry_time_to_string = (expiry_data) => {  
      return expiry_data.months > 1 ? expiry_data.months + " months" : expiry_data.days + " days";
    }

    const validCoinData = (coins_data, new_unconfirmed_coins_data) => {
      let validA =  true;
      let validB = true;

      // do not delete coins
      if(coins_data === undefined || coins_data === null || coins_data.length === 0){
        validA =  false;
      }

      if(new_unconfirmed_coins_data === undefined || new_unconfirmed_coins_data === null || new_unconfirmed_coins_data.length === 0){
        validB = false;
      }

      //  if either of these stay true, let it set coins as there is data
      return (validA || validB);
    }

    // deleting modals
    const onDeleteCoinDetails = useCallback((item) => {
      setCurrentItem(item);
      setShowDeleteCoinDetails(true);
    },[setCurrentItem,setShowDeleteCoinDetails])

    const handleDeleteCoinYes = (item) => {
      item.status = "DELETED";
      item.deleting = true;
      item.privacy_data.msg = 'coin currently being deleted';
      callRemoveCoin(item.shared_key_id);
      setShowDeleteCoinDetails(false);
    }

    const handleDeleteCoinNo = () => {
      setShowDeleteCoinDetails(false);
    }


    //Load coins once component done render
    useEffect(() => {
      const [coins_data] = callGetUnspentStatecoins();
      //Load all coins that aren't unconfirmed

      let unconfirmed_coins_data = callGetUnconfirmedStatecoinsDisplayData();
      //Load unconfirmed coins

      let undeposited_coins_data = dispatch(callGetUnconfirmedAndUnmindeCoinsFundingTxData)
      //Load coins that haven't yet been sent BTC

      if(validCoinData(coins_data, unconfirmed_coins_data)){
        setCoins({
          unspentCoins: coins_data,
          unConfirmedCoins: unconfirmed_coins_data
        })
      }

      setInitCoins(undeposited_coins_data);

      // Update total_balance in Redux state
      if(filterBy !== 'default') {
        const coinsByStatus = filterCoinsByStatus([...coins_data, ...unconfirmed_coins_data], filterBy);
        const total = coinsByStatus.reduce((sum, currentItem) => sum + currentItem.value , 0);
        dispatch(updateBalanceInfo({total_balance: total, num_coins: coinsByStatus.length}));
      } else {
        const coinsNotWithdraw = coins_data.filter(coin => (
          coin.status !== STATECOIN_STATUS.WITHDRAWN && 
          coin.status !== STATECOIN_STATUS.WITHDRAWING && 
          coin.status !== STATECOIN_STATUS.IN_TRANSFER));
        const total = coinsNotWithdraw.reduce((sum, currentItem) => sum + currentItem.value , 0);
        dispatch(updateBalanceInfo({total_balance: total, num_coins: coinsNotWithdraw.length}));
      }
    }
    , [props.refresh, filterBy, showCoinDetails, dispatch, coinsAdded, coinsRemoved]);

    // Re-fetch every 5 seconds and update state to refresh render
    // IF any coins are marked UNCONFIRMED
    useEffect(() => {

      const interval = setIntervalIfOnline(updateUnconfirmedUnspentCoins, torInfo.online, 5000)

      return () => clearInterval(interval);

    }, [coins.unConfirmedCoins, torInfo.online]);
  

    //Initialised Coin description for coin modal
    useEffect(() => {
      //Get Statecoin to check for description
      let statecoin = callGetStateCoin(showCoinDetails.coin.shared_key_id)
      if(statecoin && statecoin.description !== ""){
        //If there is a description setState
        setDscrpnConfirm(true)
        setDescription(statecoin.description)
      }
      else{
        //If no description initialise setState
        setDescription("")
        setDscrpnConfirm(false)
      }
    //function called every time coin info modal shows up
    },[showCoinDetails.coin])

  // Re-fetch swaps group data every and update swaps component
  // Initiate auto swap
   useEffect(() => {
    const interval = setIntervalIfOnline(swapInfoAndAutoSwap, torInfo.online, 3000)
    return () => clearInterval(interval);
  },
  [swapPendingCoins, torInfo.online]);

    // Enters/Re-enters coins in auto-swap
    const autoSwapLoop = () => {
      if(torInfo.online === false) return
      if(!swapPendingCoins?.length){
        return
      }

      swapPendingCoins.forEach((selectedCoin) => {
        let statecoin = callGetStateCoin(selectedCoin);
        if(statecoin && statecoin.status === STATECOIN_STATUS.AVAILABLE){
          dispatch(callDoSwap({"shared_key_id": selectedCoin}))
            .then(res => {
              handleEndAutoSwap(dispatch, statecoin, selectedCoin, res, fromSatoshi)
            }
          );
        }
      })
    }

    const swapInfoAndAutoSwap = () => {
      autoSwapLoop()
      if(props.updateSwapInfo){
        props.updateSwapInfo()
      }
    }
    
    const updateUnconfirmedUnspentCoins = () => {
      setState({});
      // console.log('interval 3')
      // in the case torInfo is undefined this should still run

      let new_unconfirmed_coins_data = callGetUnconfirmedStatecoinsDisplayData();
      // check for change in length of unconfirmed coins list and total number
      // of confirmations in unconfirmed coins list
      // check for change in the amount of blocks per item (where the main expiry date is set

      let [new_confirmed_coins_data] = callGetUnspentStatecoins();
      //Get all updated confirmed coins & coin statuses
      
      if (
        coins.unConfirmedCoins.length !== new_unconfirmed_coins_data.length
          ||
        coins.unConfirmedCoins.reduce((acc, item) => acc+item.expiry_data.confirmations,0)
          !==
        new_unconfirmed_coins_data.reduce((acc, item) => acc+item.expiry_data.confirmations,0)
          ||
        coins.unConfirmedCoins.reduce((acc, item) => acc+item.expiry_data.blocks,0)
          !==
        new_unconfirmed_coins_data.reduce((acc, item) => acc+item.expiry_data.blocks,0)
          || 
        coins.unConfirmedCoins.length !== new_confirmed_coins_data.length
      ) {
        if(validCoinData(new_confirmed_coins_data, new_unconfirmed_coins_data)){
          setCoins({
            unspentCoins: new_confirmed_coins_data,
            unConfirmedCoins: new_unconfirmed_coins_data
          })
        }
      }
    }
    

    // data to display in privacy related sections
    const getPrivacyScoreDesc = (coin) => {

      let anon_set = coin?.anon_set ? coin.anon_set : 0
      let swap_rounds = coin?.swap_rounds ? coin.swap_rounds : 0

      if (coin?.is_deposited){
        return {
          icon1: anon_icon_none,
          icon2: anon_icon2_none,
          score_desc: "Original",
          msg: " this statecoin was created in this wallet",
          rounds: "Original",
          rounds_msg: " this statecoin was created in this wallet",
        }
      }

     

      if(anon_set){
        return {
          icon1: anon_icon_high,
          icon2: anon_icon2_high,
          score_desc: "Swap set: " + anon_set.toString(),
          rounds: `Swaps: ${swap_rounds}`,
          msg: " cumulative swap group size",
          rounds_msg: " number of swap rounds completed",
        }
      } 

      return {
          icon1: anon_icon_low,
          icon2: anon_icon2_high,
          score_desc: "Swap set: " + anon_set.toString(),
          rounds: `Swaps: ${swap_rounds}`,
          msg: " cumulative swap group size",
          rounds_msg: " number of swap rounds completed",
      }
    }

    // Filter coins by status
    if(filterBy === 'default') {
      all_coins_data = all_coins_data.filter(coin => (coin.status !== STATECOIN_STATUS.WITHDRAWN && coin.status !== STATECOIN_STATUS.IN_TRANSFER && coin.status !== STATECOIN_STATUS.WITHDRAWING))
    } else {
      if(filterBy === STATECOIN_STATUS.WITHDRAWN) {
        all_coins_data = filterCoinsByStatus(all_coins_data, STATECOIN_STATUS.WITHDRAWN);
      }
      if(filterBy === STATECOIN_STATUS.WITHDRAWING) {
        all_coins_data = filterCoinsByStatus(all_coins_data, STATECOIN_STATUS.WITHDRAWING);
      }
      if(filterBy === STATECOIN_STATUS.IN_TRANSFER) {
        all_coins_data = filterCoinsByStatus(all_coins_data, STATECOIN_STATUS.IN_TRANSFER);
      }
    }

  	all_coins_data.sort((a, b) => {
  		let compareProp = sortCoin.by;
  		if(compareProp === 'expiry_data') {
  			a = (parseInt(a[compareProp]['months']) * 30) + parseInt(a[compareProp]['days']);
  			b = (parseInt(b[compareProp]['months']) * 30) + parseInt(b[compareProp]['days']);
  		} else {
  			a = a[compareProp];
  			b = b[compareProp];
  		}
  		if(a > b) {
  			return sortCoin.direction ? 1 : -1;
  		} else if (a < b) {
  			return sortCoin.direction ? -1 : 1;
  		}
  		return 0;
  	});

    if(!all_coins_data.length ) {//&& filterBy !== STATECOIN_STATUS.WITHDRAWN && filterBy !== STATECOIN_STATUS.IN_TRANSFER

      let displayMessage = "Your wallet is empty";

      if(filterBy === STATECOIN_STATUS.WITHDRAWN ||
        filterBy === STATECOIN_STATUS.WITHDRAWING
        ){
        displayMessage = "No coins withdrawn."
      }

      if(filterBy === STATECOIN_STATUS.IN_TRANSFER){
        displayMessage = "No coins transferred."
      }

      // filterBy === STATECOIN_STATUS.WITHDRAWN ? (displayMessage = "No coins withdrawn.") : ('')
      // filterBy === STATECOIN_STATUS.IN_TRANSFER ? (displayMessage = "No coins transferred.") : ('')

      return (
        <EmptyCoinDisplay message={displayMessage}/>
      );
    }


    //Track change to description
    const handleChange = e => {
      e.preventDefault()
      if(e.target.value.length < 20){
        setDescription(e.target.value)
      }
    }
  
    //Confirm description, submit redux state to change Statecoin
    const confirmDescription = () => {
      if(dscpnConfirm === false) {
        callAddDescription(showCoinDetails.coin.shared_key_id,description)

      }
      setDscrpnConfirm(!dscpnConfirm)
    }

    const copyWithdrawTxHexToClipboard = () => {
      navigator.clipboard.writeText(showCoinDetails.coin.tx_hex);
    }

    // called when clicking on TXid link in modal window
    const onClickTXID = txId => {
      let block_explorer_endpoint  = current_config.block_explorer_endpoint;

      // ensure there is https
      if (block_explorer_endpoint.substring(0, 8) !== 'https://'){
        block_explorer_endpoint = 'https://' + block_explorer_endpoint;
      }

      let finalUrl = block_explorer_endpoint  + txId;
      // open the browser for both mainnet and testnet
      window.require("electron").shell.openExternal(finalUrl);
    }

    const handleOpenCoinDetails = (shared_key_id) => {
      let coin = all_coins_data.find((coin) => {
        return coin.shared_key_id === shared_key_id
      })
      coin.privacy_data = getPrivacyScoreDesc(coin);
      setShowCoinDetails({show: true, coin: coin});
    }

    const handleSetCoinDetails = (shared_key_id) => {
      let coin = all_coins_data.find((coin) => {
          return coin.shared_key_id === shared_key_id
      })
      coin.privacy_data = getPrivacyScoreDesc(coin);
      props.setCoinDetails(coin);
    }
    return (
        <div 
          className={`main-coin-wrap ${!all_coins_data.length ? 'no-coin': ''} ${filterBy} ${!props.largeScreen ? 'small-screen': ''}`}>
          <div className="sort-filter">
            <FilterBy/>
            {(all_coins_data.length && 
              filterBy !== STATECOIN_STATUS.WITHDRAWN &&
              filterBy !== STATECOIN_STATUS.WITHDRAWING
              ) ? <SortBy sortCoin={sortCoin} setSortCoin={setSortCoin} /> : null }
          </div>
        {all_coins_data.map(item => {
          return(
            <Coin
              key={ item.shared_key_id }
              showCoinStatus = { props.showCoinStatus } // all clear - boolean
              onDeleteCoinDetails = { onDeleteCoinDetails } // useCallback function
              isMainPage = { isMainPage } // all clear - boolean
              coin_data = { item } // FIX
              getPrivacyScoreDesc = { getPrivacyScoreDesc } // FIX
              swap = { props.swap } // All clear - boolean
              send = { props.send } // All clear - boolean
              withdraw = { props.withdraw } // All clear - boolean
              selectedCoin = { props.selectedCoin } // Check
              selectedCoins = { props.selectedCoins } // Check
              setSelectedCoin = { props.setSelectedCoin } // Check this causes rerendering
              displayDetailsOnClick = { props.displayDetailsOnClick } // All clear - boolean
              setCoinDetails = { props.setCoinDetails } // Check 
              handleSetCoinDetails = { handleSetCoinDetails } 
              handleOpenCoinDetails = { handleOpenCoinDetails }
              filterBy = { filterBy }
              getAddress = { getAddress }
              displayExpiryTime = { displayExpiryTime }
              handleAutoSwap= { props.handleAutoSwap }
              render = {props.render ? (props.render) : null} />
          )
        })}

        <Modal
          show={showCoinDetails.show}
          onHide={handleCloseCoinDetails}
          className = {(filterBy === STATECOIN_STATUS.WITHDRAWN
            || filterBy === STATECOIN_STATUS.WITHDRAWING
            ) || (showCoinDetails?.coin?.swap_status !== null) ? "modal coin-details-modal lower": "modal coin-details-modal"}
        >
          <Modal.Body >
            <div>
              <div className="item">
                <img src={walleticon} className = "btc-icon" alt="icon" />
                <div className="block">
                  <span>Statecoin Value</span>
                  <span>
                    <b>{fromSatoshi(showCoinDetails.coin.value)} BTC</b>
                  </span>
                </div>
              </div>
            
              {showCoinDetails?.coin?.status && filterBy === "default" &&
                showCoinDetails.coin.status !== STATECOIN_STATUS.AVAILABLE && (
                  <div className="item swap-status-container">
                    <CoinStatus data={showCoinDetails.coin} isDetails={true} />
                    {showCoinDetails.coin.swap_status !== null ? (<SwapStatus swapStatus={SWAP_STATUS_INFO[showCoinDetails.coin.ui_swap_status]} />):(null)}
                  </div>
                )}

              {showCoinDetails.coin.status === STATECOIN_STATUS.INITIALISED ? (
              <div>
                <div className="item qr-container">            
                  <div className="block qrcode">
                      <QRCodeGenerator address = {getAddress(showCoinDetails.coin.shared_key_id)} amount={fromSatoshi(showCoinDetails.coin.value)}/>
                  </div>   
                </div>
                <div>
                    Deposit amount in a SINGLE transaction
                </div>
              </div>

              )
              :
              (
                <div>

                  <div className='item'>
                    <img src={scAddrIcon} className = "sc-address-icon" alt="icon" />
                    <div className="block">
                      <span>Statecoin Address</span>
                      {
                        showCoinDetails.coin.sc_address != undefined && (<span>
                          {showCoinDetails.coin.sc_address}
                          </span>)
                      }
                    </div>     
                  </div>

                  <div className="item">
                    <img src={utx} alt="icon" />
                    <div className="block">
                      <span>UTXO ID</span>
                      <span><button className='coinURLButton' onClick={() => onClickTXID(showCoinDetails.coin.funding_txid)}><div className='coinURLText'>{showCoinDetails.coin.funding_txid}:{showCoinDetails.coin.funding_vout}</div></button></span>
                    </div>
                  </div>
                
                  <div className="item expiry-time">
                    <div className="expiry-time-wrap">
                      <img src={time} alt="icon" />
                      <div className="block">
                        <span>
                          Time Left Until Expiry
                        </span>
                        <span className="expiry-time-left">
                          {displayExpiryTime(
                            showCoinDetails.coin.expiry_data, true
                          )}
                        </span>
                      </div>
                    </div>
                    <div
                      className="progress_bar"
                      id={
                        showCoinDetails.coin.expiry_data.days < DAYS_WARNING
                          ? "danger"
                          : "success"
                      }
                    >

                      <div className="sub">
                        <ProgressBar>
                          <ProgressBar
                            striped
                            variant={
                              showCoinDetails.coin.expiry_data.days <
                              DAYS_WARNING
                                ? "danger"
                                : "success"
                            }
                            now={
                              (showCoinDetails.coin.expiry_data.days * 100) / 90
                            }
                            key={1}
                          />
                        </ProgressBar>
                      </div>
                    </div>
                  </div>

                  <div className="item">
                    <img src={calendar} alt="icon" />
                    <div className="block">
                      <span>Date Created</span>
                      <Moment format="MM.DD.YYYY">
                        {showCoinDetails.coin.timestamp}
                      </Moment>
                      <Moment format="h:mm a">
                        {showCoinDetails.coin.timestamp}
                      </Moment>
                    </div>
                  </div>

                  <div className="item">
                    <img src={showCoinDetails.coin.privacy_data.icon1} alt="icon" />

                    <div className="block">
                      <span>Privacy Score</span>
                      <span>{showCoinDetails.coin.privacy_data.score_desc}</span>
                    </div>
                  </div>
                  <div className="item">
                    <img src={swapNumber} alt="icon" />
                    <div className="block">
                      <span>Number of Swaps Rounds</span>
                      <span>
                        Swaps: {showCoinDetails.coin.swap_rounds}
                        {/*
                                        <br/>
                                        Number of Participants: 0
                                      */}
                      </span>
                    </div>
                  </div>
                </div>)}
              {showCoinDetails?.coin?.status && (showCoinDetails.coin.status === STATECOIN_STATUS.WITHDRAWN ||
              showCoinDetails.coin.status === STATECOIN_STATUS.WITHDRAWING) ? 
              (     
                <div>
                  <div className="item tx_hex">
                    <img src={hexIcon} alt="hexagon"/>
                    <div className="block">
                      <span>Transaction Hex</span>
                        <span>
                          <div className = "txhex-container">
                            <CopiedButton handleCopy={() => copyWithdrawTxHexToClipboard()}>
                              <div className="copy-hex-wrap coin-modal-hex">
                                <img type="button" src={icon2} alt="icon"/>
                                <span>
                                  {showCoinDetails.coin.tx_hex}
                                </span>
                              </div>
                            </CopiedButton>
                          </div>
                        </span>
                    </div>
                  </div>
                  <div className="item">
                    <img src={hashIcon} alt ="hashtag"/>
                    <div className="block">
                      <span>Withdrawal TXID</span>
                      <span>
                        {showCoinDetails.coin.withdraw_txid}
                      </span>
                    </div>
                  </div>

                </div>

              )
              :
              (<div className="item">
                <img src={descripIcon} alt="description-icon"/>
                <div className="block">
                  <span>Description</span>
                  <CoinDescription
                    dscrpnConfirm = {dscpnConfirm}
                    description = {description}
                    setDscrpnConfirm = {confirmDescription}
                    handleChange={handleChange}
                    />
                </div>
              </div>)}

            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              className="action-btn-normal"
              onClick={handleCloseCoinDetails}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={showDeleteCoinDetails}
          onHide={handleCloseCoinDetails}
          className="modal coin-details-modal"
        >
          <Modal.Body>
            <div>
              Are you sure you want to delete this coin?
            </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="primary-btn ghost"
                onClick={() => handleDeleteCoinYes(currentItem)}
              >
                Yes
              </Button>
              <Button
                className="primary-btn ghost"
                onClick={handleDeleteCoinNo}
              >
                No
              </Button>
            </Modal.Footer>
        </Modal>
      </div>
    );
}

export default CoinsList;


