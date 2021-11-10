import React from 'react';
import {Link, withRouter} from "react-router-dom";
import {Logo, Settings, Help, Logout} from './headerIcons';
import {NotificationBar, ErrorPopup, ConfirmPopup} from "../../components";
import WarningPopup from '../WarningPopup';
import {unloadWallet} from '../../features/WalletDataSlice'
import './header.css';

const Header = (props) => {
  
  const handleLogout = () => {
    unloadWallet();
    props.setWalletLoaded(false);
  }

  let isDarkMode = localStorage.getItem('dark_mode');
  const activeDarkMode = () => {
    isDarkMode = document.body.classList.contains('dark-mode')
    if(isDarkMode){
      document.body.classList.remove('dark-mode')
      document.querySelector('.App').classList.remove('dark-mode')
    }
    else{
      document.body.classList.add('dark-mode')
      document.querySelector('.App').classList.add('dark-mode')
    }
  }

  return (
    <div className="Header">

      <div className="container block">
        <Link className="navbar-brand" to={props.walletLoaded ? "/home" : "/"}>
          <Logo />  
        </Link>
        <div className="menu">
          <div title="Light/Dark mode">
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
          <div title="Help" className={`nav-item  ${props.location.pathname === "/" ? "active" : ""}`}>
            <Link className="nav-link" to="/help">
              <Help />
            </Link>
          </div>

          {props.walletLoaded ?
            <div title="Settings" className={`nav-item  ${props.location.pathname === "/settings" ? "active" : ""}`}>
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
      <WarningPopup />
    </div>
  );
}

export default withRouter(Header);
