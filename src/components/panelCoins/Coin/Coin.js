
import React, {useState} from 'react';

import './Coin.css';
import '../../index.css';
import icon1 from "../../../images/table-icon.svg";

import utx from "../../../images/UTX.svg";
import time from "../../../images/time-grey.svg";
import calendar from "../../../images/calendar.svg";
import privacy from "../../../images/privacy.svg";
import swapNumber from "../../../images/swap-number.svg";
import walleticon from "../../../images/walletIcon.svg";
import question from "../../../images/question-grey.svg";

import txidIcon from "../../../images/txid-icon.svg";
import btcIcon from "../../../images/btc-icon.svg";
import timeIcon from "../../../images/time.svg";

import ProgressBar from 'react-bootstrap/ProgressBar'
import { Button, Modal } from 'react-bootstrap';


const Coin = (props) => {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);


    return (
    <div>
      <div className="CoinPanel">
        <div className="CoinAmount-block">
            <img src={icon1} alt="icon"/>
            <span className="sub">
                <b className="CoinAmount" onClick={handleShow}>  {props.amount} BTC </b>
                <div className="scoreAmount">
                    <img src={btcIcon} alt="icon"/>
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
                   <ProgressBar striped variant="success" now={35} key={1} />
                   <ProgressBar variant="warning" now={20} key={2} />
                   <ProgressBar striped variant="danger" now={10} key={3} />
               </ProgressBar>
           </div>
           <div className="CoinTimeLeft">
               <img src={timeIcon} alt="icon"/>
              <span>Time Until Expiry:  {props.time_left} months</span>

           </div>

       </div>
        <b className="CoinFundingTxid">
            <img src={txidIcon} alt="icon"/>
            {props.funding_txid}
        </b>
      </div>

        <Modal show={show} onHide={handleClose} className="modal">

            <Modal.Body>
            <div>
                <div className="item">
                    <img src={walleticon} alt="icon"/>
                    <div className="block">
                        <span> Statecoin Value</span>
                        <span><b>{props.amount}  BTC</b> </span>
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
