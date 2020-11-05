import React from 'react';
import logo from '../../images/tri-color - negative@4x.png';
import { Link, withRouter } from "react-router-dom";

import './header.css';

const Header = (props) =>  {
  return (
    <div className="Header">

      <Link className="navbar-brand" to="/">
        <img src={logo} className="Header-logo" alt="logo" />
      </Link>

      <div
        className={`nav-item  ${
          props.location.pathname === "/" ? "active" : ""
        }`}
      >
        <Link className="nav-link" to="/about">
          About
        </Link>
      </div>

      <div
        className={`nav-item  ${
          props.location.pathname === "/settings" ? "active" : ""
        }`}
      >
        <Link className="nav-link" to="/settings">
          Settings
        </Link>
      </div>

    </div>
  );
}

export default withRouter(Header);
