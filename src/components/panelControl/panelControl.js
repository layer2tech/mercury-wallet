import walletIcon from '../../images/walletIcon.png';
import walletIconSmall from '../../images/walletIconsmallIcon.png';
import pluseIcon from '../../images/pluseIcon.png';
import swapIcon from '../../images/swap-icon.png';
import arrowUp from '../../images/arrow-up.png';
import arrowDown from '../../images/arrow-down.png';

import { useSelector, useDispatch } from 'react-redux'
import React, { useState } from 'react';
import { Link } from "react-router-dom";

import StdButton from '../buttons/standardButton';
import { fromSatoshi } from '../../wallet/util'
import { STATECOIN_STATUS } from '../../wallet/statecoin'
import { updateFilter } from '../../features/WalletDataSlice'

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
]

const PanelControl = () => {
  const { balance_info, filterBy } = useSelector(state => state.walletData);

  const filterByMsg = () => {
    let return_str = "Statecoin";
    if (balance_info.num_coins > 1) {
      return_str = return_str+"s"
    }
    switch (filterBy) {
      case FILTER_BY_OPTION[0].value:
        return return_str+ " in Wallet";
      case FILTER_BY_OPTION[1].value:
        return return_str+ " withdrawn from Wallet";
      case FILTER_BY_OPTION[2].value:
        return return_str+ " in transfer process";
    }
  }

  return (
    <div className="Body">
      <h2 className="WalletAmount">
          <img src={walletIcon} alt="walletIcon"/>
          {fromSatoshi(balance_info.total_balance)} BTC
          <div className="filter-coin-icon" onClick={() => setOpenFilterMenu(!openFilterMenu)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M11.9998 20.0002C10.8971 20.0002 10 19.1031 10 18.0004C10 16.8972 10.8971 15.9997 11.9998 15.9997C13.1025 15.9997 13.9996 16.8972 13.9996 18.0004C13.9996 19.1031 13.1025 20.0002 11.9998 20.0002ZM11.9998 13.9999C10.8971 13.9999 10 13.1028 10 12.0001C10 10.8974 10.8971 10.0003 11.9998 10.0003C13.1025 10.0003 13.9996 10.8974 13.9996 12.0001C13.9996 13.1028 13.1025 13.9999 11.9998 13.9999ZM11.9998 7.9996C10.8971 7.9996 10 7.10249 10 5.9998C10 4.89711 10.8971 4 11.9998 4C13.1025 4 13.9996 4.89711 13.9996 5.9998C13.9996 7.10249 13.1025 7.9996 11.9998 7.9996Z" fill="black"/>
            </svg>
          </div>
          {openFilterMenu && (
            <>
              <div className="filter-coin-options">
                <div className="filter-coin-head">Display UTXO’s</div>
                {FILTER_BY_OPTION.map(item => (
                  <label key={item.id} onClick={() => handleFilter(item.value)}>
                    <input
                        readOnly
                        type="radio"
                        checked={filterBy === item.value}
                    />
                    {item.text}
                    <span className="checkmark"></span>
                </label>
                ))}
              </div>
              <div className="menu-overlay" onClick={() => setOpenFilterMenu(false)} />
            </>
          )}
      </h2>
        <div className="no-wallet">
            <span>{balance_info.num_coins} {filterByMsg()}</span>
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
