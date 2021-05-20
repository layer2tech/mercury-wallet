import {Logo, Settings, Help, Logout} from './headerIcons';

import {NotificationBar, ErrorPopup, ConfirmPopup} from "../../components";
import {unloadWallet} from '../../features/WalletDataSlice'

import React from 'react';
import {Link, withRouter} from "react-router-dom";

import './header.css';

const Header = (props) => {

  const handleLogout = () => {
    unloadWallet();
    props.setWalletLoaded(false);
  }

  return (
    <div className="Header dark-mode">

      <div className="container block">
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
