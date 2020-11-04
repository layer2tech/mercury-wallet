
import React from 'react';
import './index.css';
import logo from '../../images/tri-color - negative@4x.png';
import { Link, withRouter } from "react-router-dom";

const Header = (props) =>  {
  return (
    <div className="Header">

      <Link class="navbar-brand" to="/">
        <img src={logo} className="Header-logo" alt="logo" />
      </Link>

      <div
        class={`nav-item  ${
          props.location.pathname === "/" ? "active" : ""
        }`}
      >
        <Link class="nav-link" to="/about">
          About
        </Link>
      </div>
      
      <div
        class={`nav-item  ${
          props.location.pathname === "/settings" ? "active" : ""
        }`}
      >
        <Link class="nav-link" to="/settings">
          Settings
        </Link>
      </div>

    </div>
  );
}

export default withRouter(Header);
