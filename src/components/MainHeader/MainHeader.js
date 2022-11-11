"use strict";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateBalanceInfo,
  updateFilter,
  updateWalletMode,
  WALLET_MODE,
} from "../../features/WalletDataSlice";
import { fromSatoshi } from "../../wallet";
import { HIDDEN, STATECOIN_STATUS } from "../../wallet/statecoin";
import CheckBox from "../Checkbox";
import DropdownArrow from "../DropdownArrow/DropdownArrow";
import MenuPopUp from "../MenuPopUp/MenuPopUp";

import "./MainHeader.css";

export const FILTER_BY_OPTION = [
  {
    id: 1,
    value: "default",
    text: "All Spendable",
  },
  {
    id: 2,
    value: STATECOIN_STATUS.WITHDRAWN,
    text: "Withdrawn",
  },
  {
    id: 3,
    value: STATECOIN_STATUS.IN_TRANSFER,
    text: "Transferred coins",
  },
  {
    id: 4,
    value: STATECOIN_STATUS.WITHDRAWING,
    text: "Withdrawal awaiting confirmation",
  },
];

const WALLET_OPTIONS = [
  {
    id: 1,
    value: "STATECHAIN",
    text: "Statechain",
  },
  {
    id: 2,
    value: "LIGHTNING",
    text: "Lightning",
  },
];

const MainHeader = ({ mainUnit, icon }) => {
  const dispatch = useDispatch();
  const { filterBy, balance_info, walletMode } = useSelector(
    (state) => state.walletData
  );

  const [isToggleOn, setIsToggleOn] = useState(false);
  // const filterBy = useSelector((state) => state.walletData.filterBy);
  // const balance_info = useSelector((state) => state.walletData.balance_info);

  const onHideBalanceChange = ({ checked }) => {
    dispatch(updateBalanceInfo({ ...balance_info, hidden: checked }));
  };

  const handleFilter = (walletMode) => {
    dispatch(updateWalletMode(walletMode));
  };

  const toggleContent = (e) => {
    setIsToggleOn(!isToggleOn);
  };

  const filterByMsg = () => {
    let return_str = "Statecoin";
    if (balance_info.hidden === true || balance_info.num_coins !== 1) {
      return_str = return_str + "s";
    }
    switch (filterBy) {
      case FILTER_BY_OPTION[0].value:
        return return_str + " in Wallet";
      case FILTER_BY_OPTION[1].value:
        return return_str + " withdrawn from Wallet";
      case FILTER_BY_OPTION[2].value:
        return return_str + " transferred";
      case FILTER_BY_OPTION[3].value:
        return return_str + " withdrawn from Wallet - awaiting confirmation";
      default:
        return return_str;
    }
  };

  return (
    <div>
      <div className="home-header">
        <div className="title">
          <h2 className="main-header">
            <img src={icon} alt="walletIcon" />
            {balance_info.hidden
              ? HIDDEN
              : walletMode === WALLET_MODE.STATECHAIN
              ? fromSatoshi(balance_info.total_balance)
              : 15000}{" "}
            {mainUnit}
            {/* LIGHTNING BALANCE JUST PLACEHOLDER ATM  */}
          </h2>
          <div className="sub-header">
            <span data-cy="home-header-balance">
              {balance_info.hidden
                ? HIDDEN
                : walletMode === WALLET_MODE.STATECHAIN
                ? `${balance_info.num_coins} `
                : "2 "}
              {/* Placeholder total channel number  */}

              {walletMode === WALLET_MODE.STATECHAIN
                ? filterByMsg()
                : "Open channels"}
            </span>
          </div>
        </div>
        {/* <div className='selection'>
                    < DropdownArrow 
                        isToggleOn = {isToggleOn}
                        toggleContent = {toggleContent} />
                    <MenuPopUp
                        openMenu = {isToggleOn} 
                        setOpenMenu = {toggleContent}
                        selected = {walletMode}
                        handleChange = {handleFilter}
                        options = {WALLET_OPTIONS}
                        title = {"Select Wallet"}/>
                </div> */}
      </div>
      <div className="ActionGroupLeft">
        <CheckBox
          description=""
          label={balance_info.hidden ? "Show balance" : "Hide balance"}
          checked={!!balance_info.hidden}
          onChange={onHideBalanceChange}
        />
      </div>
    </div>
  );
};

export default MainHeader;
