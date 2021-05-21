import React from 'react';
import {Link, withRouter} from "react-router-dom";
import { useDispatch } from 'react-redux';
import {Logo, Settings, Help, Logout} from './headerIcons';
import {NotificationBar, ErrorPopup, ConfirmPopup} from "../../components";
import {unloadWallet} from '../../features/WalletDataSlice'
import {toggleDarkMode} from '../../features/ThemeSlice'

import './header.css';

const Header = (props) => {
  const dispatch = useDispatch();
  const handleLogout = () => {
    unloadWallet();
    props.setWalletLoaded(false);
  }
  const activeDarkMode = () => {
    const isDarkMode = localStorage.getItem('dark_mode') === '1';
    localStorage.setItem('dark_mode', isDarkMode ? 0 : 1);
    dispatch(toggleDarkMode());
  }
  return (
    <div className="Header">

      <div className="container block">
        <button type="button" onClick={activeDarkMode}>Dark Mode</button>
        <Link className="navbar-brand" to={props.walletLoaded ? "/home" : "/"}>
          <Logo />
        </Link>

        <div className="menu">
          <div className={`nav-item  ${props.location.pathname === "/" ? "active" : ""}`}>
            <Link className="nav-link" to="/help">
              <Help />
            </Link>
          </div>

          {props.walletLoaded ?
            <div className={`nav-item  ${props.location.pathname === "/settings" ? "active" : ""}`}>
              <Link className="nav-link" to="/settings">
                <Settings />
              </Link>
            </div>
            :
            null
          }
          {props.walletLoaded && (
            <div className={`nav-item`}>
              <ConfirmPopup onOk={handleLogout}>
                <div className="header-logout">
                  <Logout />
                </div>
              </ConfirmPopup>
            </div>
          )}
        </div>
      </div>
      <NotificationBar />
      <ErrorPopup />
    </div>
  );
}

export default withRouter(Header);
