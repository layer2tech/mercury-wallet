import React, {Component, useState} from 'react';

import './Coin.css';
import '../../index.css';
import icon1 from "../../../images/table-icon.svg";
import icon2 from "../../../images/table-icon-grey.svg";

import medium from "../../../images/table-icon-medium.svg";

import utx from "../../../images/UTX.svg";
import time from "../../../images/time-grey.svg";
import calendar from "../../../images/calendar.svg";
import privacy from "../../../images/privacy.svg";
import swapNumber from "../../../images/swap-number.svg";
import walleticon from "../../../images/walletIcon.svg";
import close from "../../../images/close-grey.svg";
import txidIcon from "../../../images/txid-icon.svg";
import timeIcon from "../../../images/time.svg";
import check from "../../../images/check-grey.svg";

import {Wallet} from '../../../wallet/wallet'

import ProgressBar from 'react-bootstrap/ProgressBar'
import {Button, Modal} from 'react-bootstrap';
import Moment from "react-moment";


import question from "../../../images/question-mark.svg";


const Coin = (props) => {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const wallet = Wallet.buildMock();
    const data = wallet.getStatecoinsBalance()
    console.log(wallet.getStatecoinsBalance())

    const statecoinData = data.map(item => (



        <div>
            <div>
                {item.swap_rounds === 0 ? <div className="CoinPanel">
                    <div className="CoinAmount-block">
                        <img src={icon2} alt="icon"/>
                        <span className="sub">
                <b className="CoinAmount" onClick={handleShow}>  {item.value} BTC </b>
                <div className="scoreAmount">
                    <img src={close} alt="icon"/>
                    No Privacy Score

                    <span className="tooltip">
                        <b> No Privacy Score: </b> Withdrawn BTC wille private
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
                <b className="CoinAmount" onClick={handleShow}>  {item.value} BTC </b>
                <div className="scoreAmount">
                    <img src={question} alt="icon"/>
                     Low Privacy Score

                    <span className="tooltip">
                        <b> High Privacy Score: </b> Withdrawn BTC wille private
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
                <b className="CoinAmount" onClick={handleShow}>  {item.value} BTC </b>
                <div className="scoreAmount">
                    <img src={question} alt="icon"/>
                     Medium Privacy Score

                    <span className="tooltip">
                        <b> Medium Privacy Score: </b> Withdrawn BTC wille private
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
                <b className="CoinAmount" onClick={handleShow}>  {item.value} BTC </b>
                <div className="scoreAmount">
                    <img src={check} alt="icon"/>
                     High Privacy Score

                    <span className="tooltip">
                        <b> High Privacy Score: </b> Withdrawn BTC wille private
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

            </div>


        </div>


    ))


    return (
        <div>
            {statecoinData}

            <Modal show={show} onHide={handleClose} className="modal">

                <Modal.Body>
                    <div>
                        <div className="item">
                            <img src={walleticon} alt="icon"/>
                            <div className="block">
                                <span> Statecoin Value</span>
                                <span><b>{props.amount} BTC</b> </span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={utx} alt="icon"/>
                            <div className="block">
                                <span>UTXO ID:</span>
                                <span>4ef47f6eb681d5d94ef47f6eb681d5d94ef47f6eb681d5d94ef47f6eb681d5d94ef47f6eb6</span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={time} alt="icon"/>
                            <div className="block">
                                <span>Time Left Until Expiry</span>
                                <span>411.8 Months</span>
                                <span>bar</span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={calendar} alt="icon"/>
                            <div className="block">
                                <span>Date Created</span>
                                <span>412.10.2020  <br/> 13:30:12PM </span>
                            </div>
                        </div>
                        <div className="item">
                            <img src={privacy} alt="icon"/>

                            <div className="block">
                                <span>Privacy Score</span>
                                <span>Low: 10 </span>

                            </div>
                            <img className="question-icon" src={question} alt="icon"/>
                        </div>
                        <div className="item">
                            <img src={swapNumber} alt="icon"/>
                            <div className="block">
                                <span>Number of Swaps Rounds</span>
                                <span>SwapId: 10 <br/>  Number of Participants: 10  </span>
                            </div>

                        </div>


                    </div>


                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>

                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Coin;
