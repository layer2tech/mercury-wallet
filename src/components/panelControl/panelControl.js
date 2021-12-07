import walletIcon from '../../images/walletIcon.png';
import walletIconSmall from '../../images/walletIconsmallIcon.png';
import minusIcon from '../../images/minus.svg'
import pluseIcon from '../../images/pluseIcon.png';
import swapIcon from '../../images/swap-icon.png';
import arrowUp from '../../images/arrow-up.png';
import arrowDown from '../../images/arrow-down.png';

import { useSelector } from 'react-redux'
import React from 'react';
import { Link } from "react-router-dom";

import StdButton from '../buttons/standardButton';
import { fromSatoshi } from '../../wallet/util'
import { STATECOIN_STATUS } from '../../wallet/statecoin'

import './panelControl.css';
import '../index.css';

export const FILTER_BY_OPTION = [
  {
    id: 1,
    value: 'default',
    text: 'All Spendable'
  },
  {
    id: 2,
    value: STATECOIN_STATUS.WITHDRAWN,
    text: 'Withdrawn'
  },
  {
    id: 3,
    value: STATECOIN_STATUS.IN_TRANSFER,
    text: 'Transferred coins'
  },
  {
    id: 4,
    value: STATECOIN_STATUS.WITHDRAWING,
    text: 'Withdrawal awaiting confirmation'
  },
]

const PanelControl = () => {
  const { balance_info, filterBy } = useSelector(state => state.walletData);

  const filterByMsg = () => {
    let return_str = "Statecoin";
    if (balance_info.num_coins !== 1) {
      return_str = return_str+"s"
    }
    switch (filterBy) {
      case FILTER_BY_OPTION[0].value:
        return return_str+ " in Wallet";
      case FILTER_BY_OPTION[1].value:
        return return_str+ " withdrawn from Wallet";
      case FILTER_BY_OPTION[2].value:
        return return_str+ " transferred";
      default:
        return return_str;
    }
  }

  return (
    <div className="Body panelControl">
      <h2 className="WalletAmount">
          <img src={walletIcon} alt="walletIcon"/>
          {fromSatoshi(balance_info.total_balance)} BTC
      </h2>
        <div className="no-wallet">
            <span>{balance_info.num_coins} {filterByMsg()}</span>
        </div>
      <div className="ButtonsPanel">
        <div className="ActionGroupLeft">

          <Link to="/deposit">
              <StdButton
                  label="Deposit"  icon={pluseIcon}
                  className="Body-button blue"/>
          </Link>
          <Link to="/withdraw">
            <StdButton
                label="Withdraw" icon={minusIcon}
                className="Body-button blue"/>
          </Link>

        </div>
        <div className="ActionGroupRight">
          <Link to="/swap_statecoin">
            <StdButton
                label="Swap" icon={swapIcon}
                className="Body-button blue"/>
          </Link>
          <Link to="/send_statecoin">
            <StdButton
                label="Send" icon={arrowUp}
                className="Body-button "/>
          </Link>
          <Link to="/receive_statecoin">
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
