"use strict";
import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Storage } from "../../store";
import {
  walletLoad,
  setError,
  callGetUnspentStatecoins,
  setWalletLoaded,
  initActivityLogItems,
  loadWalletFromMemory,
  walletLoadConnection,
} from "../../features/WalletDataSlice";
import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg";
import "./LoadWallet.css";
import { STATECOIN_STATUS } from "../../wallet";

const LoadWalletPage = (props) => {
  const [showPass, setShowPass] = useState(false);
  const dispatch = useDispatch();
  const history = useHistory();

  let store = new Storage("wallets/wallet_names");

  let wallet_names = store.getWalletNames().reverse();

  const [selectedWallet, setSelected] = useState(
    wallet_names.length ? wallet_names[0] : ""
  );
  const toggleShowPass = () => setShowPass(!showPass);
  const onSelectedWalletChange = (event) => {
    setSelected(event.target.value);
  };
  const [passwordEntered, setPasswordEntered] = useState("");
  const onPasswordChange = (event) => {
    setPasswordEntered(event.target.value);
  };

  // Quick check for expiring or potentially dangerous coins.
  // If so display error dialogue
  const checkForCoinsHealth = () => {
    let unspent_coins_data = callGetUnspentStatecoins();
    let coins_data = unspent_coins_data[0];
    if (!coins_data) {
      return;
    }
    for (let i = 0; i < coins_data.length; i++) {
      //      if (coins_data[i].wallet_version !== callGetVersion()) {
      //        dispatch(setError({msg: "Warning: Coin in wallet was created in previous wallet version. Due to rapid development some backward incompatible changes may break old coins. We recommend withdrawing testnet coins and creating a fresh wallet."}))
      //        break;
      //      };
      if (coins_data[i].status === STATECOIN_STATUS.SWAPLIMIT) {
        dispatch(
          setError({
            msg: "Warning: Coin in wallet is close to expiring. Expiring coins not eligible for swaps. Withdraw as soon as possible.",
          })
        );
      }
      if (coins_data[i].expiry_data.months <= 1) {
        dispatch(
          setError({ msg: "Warning: Coin in wallet is close to expiring." })
        );
        break;
      }
    }
  };

  // Attempt to load wallet. If fail display error.
  const onContinueClick = async (event) => {
    // check for password
    if (
      typeof selectedWallet === "string" ||
      selectedWallet instanceof String
    ) {
      try {
        let wallet = await loadWalletFromMemory(
          selectedWallet,
          passwordEntered
        );

        history.push("/home");
        dispatch(setWalletLoaded({ loaded: true }));

        await walletLoadConnection(wallet);
      } catch (e) {
        event.preventDefault();
        dispatch(setError({ msg: e.message }));
        return;
      }
    } else {
      try {
        let wallet = await loadWalletFromMemory(
          selectedWallet.name,
          passwordEntered
        );

        history.push("/home");
        dispatch(setWalletLoaded({ loaded: true }));

        await walletLoadConnection(wallet);
      } catch (e) {
        event.preventDefault();
        dispatch(setError({ msg: e.message }));
        return;
      }
    }
    checkForCoinsHealth();
    initActivityLogItems();
    dispatch(setWalletLoaded({ loaded: true }));
  };

  const enterContinue = (event) => {
    if (event.key === "Enter") {
      // On enter key press: prevent rerender
      event.preventDefault();
      onContinueClick(event);
    }
  };

  const populateWalletNameOptions = () => {
    return wallet_names.map((item, index) => (
      <option key={index} value={item.name}>
        {item.name}
      </option>
    ));
  };

  return (
    <div className="memory-form">
      <form data-testid="form">
        {wallet_names.length ? (
          <div>
            <p>Select a wallet to load and input its password </p>

            <select
              data-cy="load-wallet-names"
              value={selectedWallet}
              onChange={onSelectedWalletChange}
              data-testid="select"
            >
              {populateWalletNameOptions()}
            </select>

            <div className="inputs-item">
              <input
                data-cy="load-wallet-password-input"
                id="Passphrase"
                type={showPass ? "text" : "password"}
                name="password"
                required
                placeholder="Password "
                value={passwordEntered}
                onChange={onPasswordChange}
                onKeyPress={enterContinue}
              />
              <span className={"eye-icon"} onClick={toggleShowPass}>
                {showPass ? (
                  <img alt="eye icon off" src={eyeIconOff} />
                ) : (
                  <img alt="eye icon off" src={eyeIcon} />
                )}
              </span>
            </div>
            <div className="footer-btns">
              <Link to="/" className="primary-btn-link back">
                Go Back
              </Link>
              <button
                data-cy="load-wallet-confirm-btn"
                type="submit"
                className="primary-btn blue"
                onClick={onContinueClick}
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="no-wallets">
            <svg
              width="100"
              height="100"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={"exclamation"}
            >
              <path
                d="M9.9999 19.9998C4.48594 19.9998 0 15.5139 0 9.9999C0 4.48594 4.48594 0 9.9999 0C15.5139 0 19.9998 4.48594 19.9998 9.9999C19.9998 15.5139 15.5139 19.9998 9.9999 19.9998ZM9 12.9996V15.0003H10.9998V12.9996H9ZM9 5.0004V10.9998H10.9998V5.0004H9Z"
                fill="var(--button-border)"
              />
            </svg>
            <p>No Wallet in memory. Please create a new one.</p>
            <div className="footer-btns">
              <Link to="/" className="primary-btn blue">
                Go Back
              </Link>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default LoadWalletPage;
