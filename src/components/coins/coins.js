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

import React, {useState} from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar'
import {Button, Modal} from 'react-bootstrap';
import { useSelector } from 'react-redux'

import { fromSatoshi } from '../../wallet/util'

import './coins.css';
import '../index.css';

const Coins = (props) => {
    const [showCoinDetails, setShowCoinDetails] = useState({show: false,  coin: {value: 0}});  // Display details of Coin in Modal
    const handleOpenCoinDetails = (shared_key_id) => {
      let coin = coins_data.find((coin) => {return coin.shared_key_id==shared_key_id})
      setShowCoinDetails({show: true, coin: coin});
    }
    const handleCloseCoinDetails = () => {
      props.setSelectedCoin(null);
      setShowCoinDetails({show: false,  coin: {value: 0}});
    }

    // Set selected coin
    const selectCoin = (shared_key_id) => {
      shared_key_id === props.selectedCoin ? props.setSelectedCoin(null) : props.setSelectedCoin(shared_key_id);
      if (props.displayDetailsOnClick) {
        handleOpenCoinDetails(shared_key_id)
      }
    }

    // Check if coin is selected. If so return CSS.
    const isSelectedStyle = (shared_key_id) => {return props.selectedCoin === shared_key_id ? {backgroundColor: "#e6e6e6"} : {}}

    const coins_data = useSelector(state => state.walletData).coins_data;
    const statecoinData = coins_data.map(item => (
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
                            <span>Time Until Expiry: 12 months</span>

                        </div>

                    </div>
                    <b className="CoinFundingTxid">
                        <img src={txidIcon} alt="icon"/>
                        {item.txid}
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
                            <span>Time Until Expiry: 12 months</span>

                        </div>

                    </div>
                    <b className="CoinFundingTxid">
                        <img src={txidIcon} alt="icon"/>
                        {item.txid}
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
                            <span>Time Until Expiry: 12 months</span>
                        </div>

                    </div>
                    <b className="CoinFundingTxid">
                        <img src={txidIcon} alt="icon"/>
                        {item.txid}
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
                            <span>Time Until Expiry: 12 months</span>

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
                                <span>Time Left Until Expiry</span>
                                <span>12 Months</span>
                                <span></span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={calendar} alt="icon"/>
                            <div className="block">
                                <span>Date Created</span>
                                <span>{showCoinDetails.coin.timestamp}
                                    <br/>
                                    13:30:12PM
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
