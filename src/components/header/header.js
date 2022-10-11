"use strict";
import React, { useEffect } from "react";
import { Link, withRouter } from "react-router-dom";
import { Logo, Settings, Help, Logout } from "./headerIcons";
import {
  NotificationBar,
  ErrorPopup,
  ConfirmPopup,
  ProgressBar,
} from "../../components";
import OneOffMessage from "../OneOffMessage/OneOffMessage";
import {
  unloadWallet,
  stopWallet,
  setWalletLoaded,
} from "../../features/WalletDataSlice";
import "./header.css";
import TorCircuit from "./TorInfo/TorCircuit";
import { useDispatch, useSelector } from "react-redux";
import WarningPopup from "../WarningPopUp/WarningPopUp";
import InfoModal from "../InfoModal/InfoModal";
import isElectron from "is-electron";

const Header = (props) => {
  const dispatch = useDispatch();

  const walletLoaded = useSelector((state) => state.walletData).walletLoaded;

  const handleLogout = async () => {
    await stopWallet();
    unloadWallet();
    dispatch(setWalletLoaded({ loaded: false }));
  };

  useEffect(() => {
    if(!isElectron()){
      if(localStorage.dark_mode){
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
        document.querySelector(".App").classList.add("dark-mode");
        localStorage.setItem("dark_mode", "1");
      } else{
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.querySelector(".App").classList.remove("dark-mode");
        localStorage.removeItem("dark_mode");
      }
    }
  })

  let isDarkMode = localStorage.getItem("dark_mode");
  const activeDarkMode = async () => {
    isDarkMode = document.body.classList.contains("dark-mode");

    if (isElectron()) {
      if (isDarkMode) {
        await window.darkMode.off();
        document.body.classList.remove("dark-mode");
        document.querySelector(".App").classList.remove("dark-mode");
        localStorage.removeItem("dark_mode");
      } else {
        await window.darkMode.on();
        document.body.classList.add("dark-mode");
        document.querySelector(".App").classList.add("dark-mode");
        localStorage.setItem("dark_mode", "1");
      }
    } else {
      // browser changes
      if (!localStorage.dark_mode) {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
        document.querySelector(".App").classList.add("dark-mode");
        localStorage.setItem("dark_mode", "1");
      } else if (localStorage.dark_mode) {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.querySelector(".App").classList.remove("dark-mode");
        localStorage.removeItem("dark_mode");
      }
    }
  };

  return (
    <div className="Header">
      <div className="container block">
        <Link className="navbar-brand" to={walletLoaded ? "/home" : "/"}>
          <Logo />
        </Link>

        <div className="menu">
          {walletLoaded && <TorCircuit online={props.online} />}
          <div title="Light/Dark mode">
            <label className="toggle2">
              <input
                className="toggle-checkbox2"
                type="checkbox"
                onChange={activeDarkMode}
                checked={isElectron ? (isDarkMode): (!localStorage.dark_mode)}
              />
              <div className="toggle-switch2" />
            </label>
          </div>

          <div
            title="Help"
            className={`nav-item  ${
              props.location.pathname === "/" ? "active" : ""
            }`}
          >
            <Link className="nav-link" to="/help">
              <Help />
            </Link>
          </div>

          {walletLoaded ? (
            <div
              title="Settings"
              className={`nav-item  ${
                props.location.pathname === "/settings" ? "active" : ""
              }`}
            >
              <Link className="nav-link" to="/settings">
                <Settings />
              </Link>
            </div>
          ) : null}

          {walletLoaded && (
            <div className={`nav-item`}>
              <ConfirmPopup onOk={handleLogout}>
                <div title="Exit wallet" className="header-logout">
                  <Logout />
                </div>
              </ConfirmPopup>
            </div>
          )}
        </div>
      </div>

      <NotificationBar />
      <ErrorPopup />
      <OneOffMessage />
      <ProgressBar />
      <WarningPopup />
      <InfoModal />
    </div>
  );
};

export default withRouter(Header);
