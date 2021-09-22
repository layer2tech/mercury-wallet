import React from 'react';
import {Link, withRouter} from "react-router-dom";
import { useDispatch } from 'react-redux';
import {Logo, Settings, Help, Logout} from './headerIcons';
import {NotificationBar, ErrorPopup, ConfirmPopup} from "../../components";
import WarningPopup from '../WarningPopup';
import {unloadWallet} from '../../features/WalletDataSlice'
import {toggleDarkMode} from '../../features/ThemeSlice'

import './header.css';

const Header = (props) => {
  const dispatch = useDispatch();
  const handleLogout = () => {
    unloadWallet();
    props.setWalletLoaded(false);
  }
  const isDarkMode = localStorage.getItem('dark_mode') === '1';
  const activeDarkMode = () => {
    localStorage.setItem('dark_mode', isDarkMode ? 0 : 1);
    dispatch(toggleDarkMode());
  }
  return (
    <div className="Header">

      <div className="container block">
        <Link className="navbar-brand" to={props.walletLoaded ? "/home" : "/"}>
          <Logo />  
        </Link>
        <div className="menu">
          <div>
            <label className="toggle">
              <input
                className="toggle-checkbox"
                type="checkbox"
                onChange={activeDarkMode}
                checked={isDarkMode}
              />
              <div className="toggle-switch" />
            </label>
          </div>
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
      <WarningPopup />
    </div>
  );
}

export default withRouter(Header);
