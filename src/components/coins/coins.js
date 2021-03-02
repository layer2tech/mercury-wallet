import icon1 from "../../images/table-icon.png";
import icon2 from "../../images/table-icon-grey.png";
import medium from "../../images/table-icon-medium.png";
import utx from "../../images/UTX.png";
import time from "../../images/time-grey.png";
import calendar from "../../images/calendar.png";
import privacy from "../../images/privacy.png";
import swapNumber from "../../images/swap-number.png";
import walleticon from "../../images/walletIcon.png";
import close from "../../images/close-grey.png";
import txidIcon from "../../images/txid-icon.png";
import timeIcon from "../../images/time.png";
import check from "../../images/check-grey.png";
import question from "../../images/question-mark.png";

import React, {useState, useEffect} from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar'
import {Button, Modal} from 'react-bootstrap';
import {useSelector, useDispatch} from 'react-redux'

import { STATECOIN_STATUS } from '../../wallet'
import {fromSatoshi} from '../../wallet/util'
import {callGetUnspentStatecoins, updateBalanceInfo, callGetUnconfirmedStatecoinsDisplayData} from '../../features/WalletDataSlice'

import './coins.css';
import '../index.css';

const DEFAULT_STATE_COIN_DETAILS = {show: false, coin: {value: 0, expiry_data: {blocks: "", months: "", days: ""}}}

const Coins = (props) => {
    const dispatch = useDispatch();

    const [state, setState] = useState({});
    const [showCoinDetails, setShowCoinDetails] = useState(DEFAULT_STATE_COIN_DETAILS);  // Display details of Coin in Modal
    const handleOpenCoinDetails = (shared_key_id) => {
        let coin = all_coins_data.find((coin) => {
            return coin.shared_key_id === shared_key_id
        })
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

    const [coins_data, total_balance] = callGetUnspentStatecoins();
    // Update total_balance in Redux state
    dispatch(updateBalanceInfo({total_balance: total_balance, num_coins: coins_data.length}));

    let unconfired_coins_data = callGetUnconfirmedStatecoinsDisplayData();
    let all_coins_data = coins_data.concat(unconfired_coins_data)

    // Re-fetch every 10 seconds and update state to refresh render
    // IF any coins are marked UNCONFIRMED
    useEffect(() => {
      if (unconfired_coins_data!=undefined) {
        const interval = setInterval(() => {
          let new_unconfired_coins_data = callGetUnconfirmedStatecoinsDisplayData();
          // check for change in length of unconfirmed coins list and total number
          // of confirmations in unconfirmed coins list
          if (
            unconfired_coins_data.length != new_unconfired_coins_data.length
              ||
            unconfired_coins_data.reduce((acc, item) => acc+item.expiry_data.confirmations,0)
              !==
            new_unconfired_coins_data.reduce((acc, item) => acc+item.expiry_data.confirmations,0)
          ) {
            unconfired_coins_data = new_unconfired_coins_data
            all_coins_data = coins_data.concat(unconfired_coins_data)
            setState({}) //update state to refresh TransactionDisplay render
          }
        }, 10000);
        return () => clearInterval(interval);
      }
    }, []);

    const statecoinData = all_coins_data.map(item => (
        <div key={item.shared_key_id}>
            <div
                onClick={() => selectCoin(item.shared_key_id)}
                style={isSelectedStyle(item.shared_key_id)}>
                {item.swap_rounds === 0 ? <div className="CoinPanel">
                    <div className="CoinAmount-block">
                        <img src={icon2} alt="icon"/>
                        <span className="sub">
                            <b className="CoinAmount">  {fromSatoshi(item.value)} BTC</b>
                            <div className="scoreAmount">
                                <img src={close} alt="icon"/>
                                No Privacy Score

                                <span className="tooltip">
                                    <b>No Privacy Score:</b>
                                    Withdrawn BTC wille private
                                </span>
                            </div>
                        </span>
                    </div>
                    {item.expiry_data.blocks==-1 ?
                          <b>Confirmations: {item.expiry_data.confirmations<0 ? 0 : item.expiry_data.confirmations}</b>
                      :

                    <div className="progress_bar" id={item.expiry_data.months < 5 ? 'danger' : 'success'}>
                        <div className="sub">
                            <ProgressBar>
                                <ProgressBar striped variant={item.expiry_data.months < 5 ? 'danger' : 'success'} now={item.expiry_data.months * 100 / 12}
                                             key={1}/>
                                {/*<ProgressBar variant="warning" now={20} key={2} />*/}
                                {/*<ProgressBar striped variant="danger" now={10} key={3} />*/}
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
                </div> : null}
                {item.swap_rounds < 0 ? <div className="CoinPanel">
                    <div className="CoinAmount-block">
                        <img src={icon2} alt="icon"/>
                        <span className="sub">
                            <b className="CoinAmount">  {fromSatoshi(item.value)} BTC</b>
                            <div className="scoreAmount">
                                <img src={question} alt="icon"/>
                                Low Privacy Score

                                <span className="tooltip">
                                    <b>High Privacy Score:</b>
                                    Withdrawn BTC wille private
                                </span>
                            </div>
                        </span>
                    </div>
                    <div className="progress_bar">
                        <div className="sub">
                            <ProgressBar>
                                <ProgressBar striped variant="success" now={10.2 * 100 / 12} key={1}/>
                                {/*<ProgressBar variant="warning" now={20} key={2} />*/}
                                {/*<ProgressBar striped variant="danger" now={10} key={3} />*/}
                            </ProgressBar>
                        </div>
                        <div className="CoinTimeLeft">
                            <img src={timeIcon} alt="icon"/>
                            <span>
                              Time Until Expiry: {expiry_time_to_string(item.expiry_data)}
                            </span>

                        </div>

                    </div>
                    <b className="CoinFundingTxid">
                        <img src={txidIcon} alt="icon"/>
                        {item.funding_txid}
                    </b>
                </div> : null}
                {item.swap_rounds > 5 && item.swap_rounds < 10 ? <div className="CoinPanel">
                    <div className="CoinAmount-block">
                        <img src={medium} alt="icon"/>
                        <span className="sub">
                            <b className="CoinAmount">  {fromSatoshi(item.value)} BTC</b>
                            <div className="scoreAmount">
                                <img src={question} alt="icon"/>
                                Medium Privacy Score

                                <span className="tooltip">
                                    <b>Medium Privacy Score:</b>
                                    Withdrawn BTC wille private
                                </span>
                            </div>
                        </span>
                    </div>
                    <div>
                        <div className="sub">
                            <ProgressBar>
                                <ProgressBar striped variant="success" now={10.2 * 100 / 12} key={1}/>
                                {/*<ProgressBar variant="warning" now={20} key={2} />*/}
                                {/*<ProgressBar striped variant="danger" now={10} key={3} />*/}
                            </ProgressBar>
                        </div>
                        <div className="CoinTimeLeft">
                            <img src={timeIcon} alt="icon"/>
                            <span>
                              Time Until Expiry: {expiry_time_to_string(item.expiry_data)}
                            </span>
                        </div>

                    </div>
                    <b className="CoinFundingTxid">
                        <img src={txidIcon} alt="icon"/>
                        {item.funding_txid}
                    </b>
                </div> : null}
                {item.swap_rounds > 10 ? <div className="CoinPanel">
                    <div className="CoinAmount-block">
                        <img src={icon1} alt="icon"/>
                        <span className="sub">
                            <b className="CoinAmount">  {fromSatoshi(item.value)} BTC</b>
                            <div className="scoreAmount">
                                <img src={check} alt="icon"/>
                                High Privacy Score

                                <span className="tooltip">
                                    <b>High Privacy Score:</b>
                                    Withdrawn BTC wille private
                                </span>
                            </div>
                        </span>
                    </div>
                    <div>
                        <div className="sub">
                            <ProgressBar>
                                <ProgressBar striped variant="success" now={10.2 * 100 / 12} key={1}/>
                                {/*<ProgressBar variant="warning" now={20} key={2} />*/}
                                {/*<ProgressBar striped variant="danger" now={10} key={3} />*/}
                            </ProgressBar>
                        </div>
                        <div className="CoinTimeLeft">
                            <img src={timeIcon} alt="icon"/>
                            <span>
                              Time Until Expiry: {expiry_time_to_string(item.expiry_data)}
                            </span>

                        </div>

                    </div>
                    <b className="CoinFundingTxid">
                        <img src={txidIcon} alt="icon"/>
                        {item.funding_txid}
                    </b>
                </div> : null}
            </div>
        </div>
    ))

    return (
        <div>
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
                            <img src={privacy} alt="icon"/>

                            <div className="block">
                                <span>Privacy Score</span>
                                <span>Low: 0</span>

                            </div>
                            <img className="question-icon" src={question} alt="icon"/>
                        </div>
                        <div className="item">
                            <img src={swapNumber} alt="icon"/>
                            <div className="block">
                                <span>Number of Swaps Rounds</span>
                                <span>Swaps: {showCoinDetails.coin.swap_rounds}
                                    <br/>
                                    Number of Participants: 0
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
