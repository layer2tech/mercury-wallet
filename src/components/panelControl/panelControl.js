import { v4 as uuidv4 } from 'uuid';

import React from 'react';
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'

import { callDeposit } from '../../features/WalletDataSlice'
import { deposit, getRoot, getFeeInfo, getSmtProof, getStateChain } from '../../wallet'
import { Wallet, Statecoin, verifySmtProof, ACTION } from '../../wallet'
import { keyGen } from '../../wallet/mercury/ecdsa'
import walletIcon from '../../images/walletIcon.png';
import walletIconSmall from '../../images/walletIconsmallIcon.png';
import pluseIcon from '../../images/pluseIcon.png';
import swapIcon from '../../images/swap-icon.png';
import arrowUp from '../../images/arrow-up.png';
import arrowDown from '../../images/arrow-down.png';

import StdButton from '../buttons/standardButton';
import { fromSatoshi } from '../../wallet/util'

import './panelControl.css';
import '../index.css';
import { Link } from "react-router-dom";
import settings from "../../images/settings-icon.png";

const PanelControl = () => {
  const state = useSelector(state => state.walletData);
  const total_balance = fromSatoshi(state.total_balance);


  return (
    <div className="Body">
      <h2 className="WalletAmount">
          <img src={walletIcon} alt="walletIcon"/>
          {total_balance} BTC
      </h2>
        <div className="no-wallet">
            <span>No Statecoins in Wallet</span>
        </div>
      <div className="ButtonsPanel">
        <div className="ActionGroupLeft">


                <Link className="nav-link" to="/deposit">
                    <StdButton
                        label="Deposit"  icon={pluseIcon}
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
