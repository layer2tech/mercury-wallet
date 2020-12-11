import React from 'react';
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

import { addCoin, removeCoin } from '../../features/CoinDataSlice'
import { deposit, getRoot, getFeeInfo, getSmtProof, getStateChain } from '../../wallet'
import { Wallet, Statecoin, verifySmtProof } from '../../wallet'
import walletIcon from '../../images/walletIcon.png';
import walletIconSmall from '../../images/walletIconsmallIcon.png';
import pluseIcon from '../../images/pluseIcon.png';
import swapIcon from '../../images/swap-icon.png';
import arrowUp from '../../images/arrow-up.png';
import arrowDown from '../../images/arrow-down.png';

import StdButton from '../buttons/standardButton';

import './panelControl.css';
import '../index.css';
import { Link } from "react-router-dom";
import settings from "../../images/settings-icon.png";

const PanelControl = () => {
  const dispatch = useDispatch()
  const totalAmount = useSelector(state => state.coinData.total_amount)

  const createButtonAction = async () => {
    var wallet = Wallet.buildMock();
    deposit(wallet)
    // console.log(wallet)
    // console.log(wallet.getActivityLog(10))
    // console.log(wallet.getUnspentStatecoins())
    let proof_key = "02c69dad87250b032fe4052240eaf5b8a5dc160b1a144ecbcd55e39cf4b9b49bfd"
    let funding_txid = "64ec6bc7f794343a0c3651c0578f25df5134322b959ece99795dccfffe8a87e9"


  }


  return (
    <div className="Body">
      <h2 className="WalletAmount">
          <img src={walletIcon} alt="walletIcon"/>
          {totalAmount} BTC
      </h2>
        <div className="no-wallet">
            <span>No Statecoins in Wallet</span>
        </div>
      <div className="ButtonsPanel">
        <div className="ActionGroupLeft">


                <Link className="nav-link" to="/deposit">
                    <StdButton
                        label="Deposit"  icon={pluseIcon}
                        onClick={createButtonAction}
                        className="Body-button blue"/>
                </Link>



          <Link className="nav-link" to="/swap_statecoin">

            <StdButton
                label="Swap" icon={swapIcon}

                className="Body-button blue"/>
          </Link>

          <Link className="nav-link" to="/withdraw">
            <StdButton
                label="Withdraw" icon={walletIconSmall}
                className="Body-button yellow"/>
          </Link>


        </div>
        <div className="ActionGroupRight">

          <Link className="nav-link" to="/send_statecoin">
            <StdButton
                label="Send" icon={arrowUp}

                className="Body-button "/>
          </Link>
          <Link className="nav-link" to="/receive_statecoin">
            <StdButton
                label="Receive" icon={arrowDown}

                className="Body-button"/>
          </Link>


        </div>
      </div>
    </div>
  );
}

export default PanelControl;
