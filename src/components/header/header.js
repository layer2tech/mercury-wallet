import React from 'react';
import logo from '../../images/monochrome - white@4x.png';
import question from '../../images/header-question.png';
import settings from '../../images/settings-icon.png';
import { Link, withRouter } from "react-router-dom";
import { NotificationBar, ErrorPopup } from "../../components";
import './header.css';

const Header = (props) => {
  return (
    <div className="Header">

      <div className="container block">
        <Link className="navbar-brand" to={props.walletLoaded ? "/home" : "/"}>
          <img src={logo} className="Header-logo" alt="logo" />
        </Link>

        <div className="menu">
          <div className={`nav-item  ${props.location.pathname === "/" ? "active" : ""}`}>
            <Link className="nav-link" to="/help">
              <img src={question} alt="question" />
            </Link>
          </div>

          {props.walletLoaded ?
            <div className={`nav-item  ${props.location.pathname === "/settings" ? "active" : ""}`}>
              <Link className="nav-link" to="/settings">
                <img src={settings} alt="settings" />
              </Link>
            </div>
            :
            null
          }
        </div>
      </div>
      <NotificationBar />
      <ErrorPopup />
    </div>
  );
}

export default withRouter(Header);
