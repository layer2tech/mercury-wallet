"use strict";
import plus from "../../images/plus-black.png";
import restore from "../../images/restore-img.png";
import check from "../../images/icon-action-check_circle.png";

import React, { useEffect, useState } from "react";
import { Link, withRouter } from "react-router-dom";

import "./Welcome.css";
import { useDispatch } from "react-redux";
import { setWalletLoaded } from "../../features/WalletDataSlice";

const Welcome = () => {
  const dispatch = useDispatch();
  const state = useState(0);
  const checked = state[0];
  const changeCheckbox = state[1];


  useEffect(()=>{
    dispatch(setWalletLoaded({ loaded: false }))

  },[])

  return (
    <div className="welcome-first">
      <div>
        <h1 data-cy="mercury-landing-title">Welcome to Mercury</h1>
        <p data-cy="mercury-landing-message">
          If you’re using Mercury wallet for the first time, create a new
          wallet. If you have an existing wallet, load the wallet from your
          device storage, or use your seed phrase or backup file to restore the
          wallet.
        </p>
      </div>
      <div data-cy="welcome-btns-list" className="welcome-btns">
        <div
          data-cy="create-wallet-btn"
          onClick={() => changeCheckbox(1)}
          className={`${checked === 1 ? "selected" : ""}`}
        >
          <img src={plus} alt="plus" />
          <span>Create New Wallet</span>
          <img className="check-img" src={check} alt="plus" />
        </div>
        <div
          data-cy="recover-wallet-btn"
          onClick={() => changeCheckbox(2)}
          className={`${checked === 2 ? "selected" : ""}`}
        >
          <img src={restore} alt="restore" />
          <span>Restore From Seed/Backup</span>
          <img className="check-img" src={check} alt="plus" />
        </div>

        <div
          data-cy="load-wallet-btn"
          onClick={() => changeCheckbox(3)}
          className={`${checked === 3 ? "selected" : ""}`}
        >
          <img src={restore} alt="restore" />
          <span>Load Existing Wallet</span>
          <img className="check-img" src={check} alt="plus" />
        </div>
      </div>
      <Link
        data-cy="landing-continue-btn"
        to={`${
          checked === 1
            ? "create_wallet"
            : checked === 2
            ? "restore_wallet"
            : "load_wallet"
        }`}
        className={`send primary-btn blue  ${!checked ? "disabled" : ""}`}
      >
        Continue
      </Link>
    </div>
  );
};

export default withRouter(Welcome);
