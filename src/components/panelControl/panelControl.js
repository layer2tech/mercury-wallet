'use strict';
import walletIcon from '../../images/walletIcon.png';
import walletIconSmall from '../../images/walletIconsmallIcon.png';
import minusIcon from '../../images/minus.svg'
import pluseIcon from '../../images/pluseIcon.png';
import swapIcon from '../../images/swap-icon.png';
import arrowUp from '../../images/arrow-up.png';
import arrowDown from '../../images/arrow-down.png';

import { useSelector, useDispatch } from 'react-redux'
import React from 'react';
import { Link } from "react-router-dom";

import StdButton from '../buttons/standardButton';
import { fromSatoshi } from '../../wallet/util'
import { STATECOIN_STATUS, HIDDEN } from '../../wallet/statecoin'
import { updateBalanceInfo } from '../../features/WalletDataSlice';
import { CheckBox } from "../../components";

import './panelControl.css';
import '../index.css';
import RouterButton from '../buttons/RouterButton/RouterButton';

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
  const dispatch = useDispatch();
  const balance_info = useSelector((state) => state.walletData.balance_info);
  const filterBy = useSelector((state) => state.walletData.filterBy);
  const onHideBalanceChange = ({ checked }) => {
    dispatch(updateBalanceInfo({ ...balance_info, hidden: checked }))
  };
  
  const filterByMsg = () => {
    let return_str = "Statecoin";
    if (balance_info.hidden === true || balance_info.num_coins !== 1) {
      return_str = return_str+"s"
    }
    switch (filterBy) {
      case FILTER_BY_OPTION[0].value:
        return return_str+ " in Wallet";
      case FILTER_BY_OPTION[1].value:
        return return_str+ " withdrawn from Wallet";
      case FILTER_BY_OPTION[2].value:
        return return_str+ " transferred";
      case FILTER_BY_OPTION[3].value:
        return return_str+ " withdrawn from Wallet - awaiting confirmation";
      default:
        return return_str;
    }
  }

  return (
    <div className="Body panelControl">
      <h2 className="WalletAmount">
          <img src={walletIcon} alt="walletIcon"/>
          {balance_info.hidden ? HIDDEN : fromSatoshi(balance_info.total_balance)} BTC
      </h2>
      <div className="no-wallet">
        <span>{balance_info.hidden ? HIDDEN : balance_info.num_coins} {filterByMsg()}</span>
      </div>
      <div className="ActionGroupLeft">
        <CheckBox
        description=""
        label={balance_info.hidden ? "Show balance" : "Hide balance"}
        checked={!!balance_info.hidden}
        onChange={onHideBalanceChange}
      />
      </div>
      <div className="ButtonsPanel">
        <div className="ActionGroupLeft">
          <RouterButton 
            route={"/deposit"}
            label={"Deposit"}
            icon={pluseIcon}
            class={"Body-button blue"}
            tooltip={"Deposit BTC"}/>
          <RouterButton 
            route={"/withdraw"}
            label={"Withdraw"}
            icon={minusIcon}
            class={"Body-button blue"}
            tooltip={"Withdraw BTC"}/>

        </div>
        <div className="ActionGroupRight">
          <RouterButton 
              route={"/swap_statecoin"}
              label={"Swap"}
              icon={swapIcon}
              class={"Body-button blue"}
              tooltip={"Swap Statecoins"}/>
          <RouterButton 
              route={"/send_statecoin"}
              label={"Send"}
              icon={arrowUp}
              class={"Body-button blue"}
              tooltip={"Send Statecoins"}/>
          <RouterButton 
              route={"/receive_statecoin"}
              label={"Receive"}
              icon={arrowDown}
              class={"Body-button blue"}
              tooltip={"Receive Statecoins"}/>
        </div>
      </div>
    </div>
  );
}

export default PanelControl;
