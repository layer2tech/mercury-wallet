import anon_icon_none from "../../images/table-icon-grey.png";
import anon_icon_low from "../../images/table-icon-medium.png";
import anon_icon_high from "../../images/table-icon.png";
import anon_icon2_none from "../../images/close-grey.png";
import anon_icon2_low from "../../images/question-mark.png";
import anon_icon2_high from "../../images/check-grey.png";
import utx from "../../images/UTX.png";
import time from "../../images/time-grey.png";
import calendar from "../../images/calendar.png";
import swapNumber from "../../images/swap-number.png";
import walleticon from "../../images/walletIcon.png";
import txidIcon from "../../images/txid-icon.png";
import timeIcon from "../../images/time.png";

import React, {useState, useEffect} from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar'
import {Button, Modal} from 'react-bootstrap';
import {useDispatch} from 'react-redux'

import {fromSatoshi} from '../../wallet/util'
import {callGetUnspentStatecoins, updateBalanceInfo, callGetUnconfirmedStatecoinsDisplayData} from '../../features/WalletDataSlice'
import SortBy from './SortBy/SortBy'

import './coins.css';
import '../index.css';

const DEFAULT_STATE_COIN_DETAILS = {show: false, coin: {value: 0, expiry_data: {blocks: "", months: "", days: ""}, privacy_data: {score_desc: ""}}}
// privacy score considered "low"
const LOW_PRIVACY = 10
// style time left timer as red after this many months
const MONTHS_WARNING = 5

const INITIAL_COINS = {
    unspentCoins: [],
    unConfirmedCoins: []
}

const INITIAL_SORT_BY = {
	direction: 0,
	by: 'value'
};

const Coins = (props) => {
    const dispatch = useDispatch();

  	const [sortCoin, setSortCoin] = useState(INITIAL_SORT_BY);
    const [coins, setCoins] = useState(INITIAL_COINS);
    const [showCoinDetails, setShowCoinDetails] = useState(DEFAULT_STATE_COIN_DETAILS);  // Display details of Coin in Modal
    const handleOpenCoinDetails = (shared_key_id) => {
        let coin = all_coins_data.find((coin) => {
            return coin.shared_key_id === shared_key_id
        })
        coin.privacy_data = getPrivacyScoreDesc(coin.swap_rounds);
        setShowCoinDetails({show: true, coin: coin});
    }
    const handleCloseCoinDetails = () => {
        props.setSelectedCoin(null);
        setShowCoinDetails(DEFAULT_STATE_COIN_DETAILS);
    }

    // Set selected coin
    const selectCoin = (shared_key_id) => {
        shared_key_id === props.selectedCoin ? props.setSelectedCoin(null) : props.setSelectedCoin(shared_key_id);
        if (props.displayDetailsOnClick) {
            handleOpenCoinDetails(shared_key_id)
        }
    }

    // Check if coin is selected. If so return CSS.
    const isSelectedStyle = (shared_key_id) => {
        return props.selectedCoin === shared_key_id ? {backgroundColor: "#e6e6e6"} : {}
    }

    // Convert expiry_data to string displaying months or days left
    const expiry_time_to_string = (expiry_data) => {
        return expiry_data.months > 0 ? expiry_data.months + " months" : expiry_data.days + " days"
    }

    //Load coins once component done render
    useEffect(() => {
      const [coins_data, total_balance] = callGetUnspentStatecoins();
      let unconfired_coins_data = callGetUnconfirmedStatecoinsDisplayData();
      setCoins({
          unspentCoins: coins_data,
          unConfirmedCoins: unconfired_coins_data
      })
      // Update total_balance in Redux state
      dispatch(updateBalanceInfo({total_balance: total_balance, num_coins: coins_data.length}));
    }, [props.refresh]);

    // Re-fetch every 10 seconds and update state to refresh render
    // IF any coins are marked UNCONFIRMED
    useEffect(() => {
      if (coins.unConfirmedCoins.length) {
        const interval = setInterval(() => {
          let new_unconfired_coins_data = callGetUnconfirmedStatecoinsDisplayData();
          // check for change in length of unconfirmed coins list and total number
          // of confirmations in unconfirmed coins list
          if (
            coins.unConfirmedCoins.length !== new_unconfired_coins_data.length
              ||
            coins.unConfirmedCoins.reduce((acc, item) => acc+item.expiry_data.confirmations,0)
              !==
            new_unconfired_coins_data.reduce((acc, item) => acc+item.expiry_data.confirmations,0)
          ) {
            setCoins({
                ...coins,
                unConfirmedCoins: [
					...coins.unConfirmedCoins,
					...new_unconfired_coins_data
				]
            })
          }
        }, 10000);
        return () => clearInterval(interval);
      }
    }, [coins.unConfirmedCoins]);

    // data to display in privacy related sections
    const getPrivacyScoreDesc = (swap_rounds) => {
      if (!swap_rounds) {
        return {
          icon1: anon_icon_none,
          icon2: anon_icon2_none,
          score_desc: "No Privacy Score",
          msg: "Withdrawn BTC will have no privacy"
        }
      }
      if (swap_rounds < LOW_PRIVACY) {
        return {
          icon1: anon_icon_low,
          icon2: anon_icon2_low,
          score_desc: "Low Privacy Score",
          msg: "Withdrawn BTC will have low privacy"
        }
      }
      return {
        icon1: anon_icon_high,
        icon2: anon_icon2_high,
        score_desc: "High Privacy Score",
        msg: "Withdrawn BTC will be private"
      }
    }

    const all_coins_data = [...coins.unspentCoins, ...coins.unConfirmedCoins];
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

    const statecoinData = all_coins_data.map(item => {
      item.privacy_data = getPrivacyScoreDesc(item.swap_rounds);

    return (
        <div key={item.shared_key_id}>
            <div
                onClick={() => selectCoin(item.shared_key_id)}
                style={isSelectedStyle(item.shared_key_id)}>

                  <div className="CoinPanel">
                    <div className="CoinAmount-block">
                        <img src={item.privacy_data.icon1} alt="icon"/>
                        <span className="sub">
                            <b className="CoinAmount">  {fromSatoshi(item.value)} BTC</b>
                            <div className="scoreAmount">
                                <img src={item.privacy_data.icon2} alt="icon"/>
                                {item.privacy_data.score_desc}
                                <span className="tooltip">
                                    <b>{item.privacy_data.score_desc}:</b>
                                      {item.privacy_data.msg}
                                </span>
                            </div>
                        </span>
                    </div>
                    {item.expiry_data.blocks===-1 ?
                          <b>Confirmations: {item.expiry_data.confirmations<0 ? 0 : item.expiry_data.confirmations}</b>
                      :

                    <div className="progress_bar" id={item.expiry_data.months < MONTHS_WARNING ? 'danger' : 'success'}>
                        <div className="sub">
                            <ProgressBar>
                                <ProgressBar striped variant={item.expiry_data.months < MONTHS_WARNING ? 'danger' : 'success'}
                                  now={item.expiry_data.months * 100 / 12}
                                  key={1}/>
                            </ProgressBar>
                        </div>
                        <div className="CoinTimeLeft">
                            <img src={timeIcon} alt="icon"/>
                            <span>
                                Time Until Expiry: <span className='expiry-time-left'>{expiry_time_to_string(item.expiry_data)}</span>
                            </span>
                        </div>
                    </div>
                  }
                    <b className="CoinFundingTxid">
                        <img src={txidIcon} alt="icon"/>
                        {item.funding_txid}
                    </b>
                    <b className="CoinSwapStatus">
                        {item.swap_id !== null &&
                            <span>
                                In swap id: {item.swap_id}
                            </span>
                        }
                        {item.swap_id === null && item.swap_status === null &&
                            <span>
                                Not currently in a swap.
                            </span>
                        }
                        {item.swap_status !== null && item.swap_id === null &&
                            <span>
                                Waiting for other swap participants...
                            </span>
                        }
                    </b>
                  </div>
              </div>
        </div>
    )})

    return (
        <div>
			<SortBy sortCoin={sortCoin} setSortCoin={setSortCoin} />
            {statecoinData}

            <Modal show={showCoinDetails.show} onHide={handleCloseCoinDetails} className="modal">
                <Modal.Body>
                    <div>
                        <div className="item">
                            <img src={walleticon} alt="icon"/>
                            <div className="block">
                                <span>Statecoin Value</span>
                                <span>
                                    <b>{fromSatoshi(showCoinDetails.coin.value)} BTC</b>
                                </span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={utx} alt="icon"/>
                            <div className="block">
                                <span>UTXO ID:</span>
                                <span>{showCoinDetails.coin.funding_txid}</span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={time} alt="icon"/>
                            <div className="block">
                                <span>
                                  Time Until Expiry: {expiry_time_to_string(showCoinDetails.coin.expiry_data)}
                                </span>
                                <span></span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={calendar} alt="icon"/>
                            <div className="block">
                                <span>Date Created</span>
                                <span>
                                  {new Date(showCoinDetails.coin.timestamp).toUTCString()}
                                </span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={showCoinDetails.coin.privacy_data.icon1} alt="icon"/>

                            <div className="block">
                                <span>Privacy Score</span>
                                <span>{showCoinDetails.coin.privacy_data.score_desc}</span>

                            </div>
                        </div>
                        <div className="item">
                            <img src={swapNumber} alt="icon"/>
                            <div className="block">
                                <span>Number of Swaps Rounds</span>
                                <span>Swaps: {showCoinDetails.coin.swap_rounds}
                                  {/*
                                    <br/>
                                    Number of Participants: 0
                                  */}
                                </span>
                            </div>
                        </div>
                    </div>

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseCoinDetails}>
                        Close
                    </Button>

                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Coins;
