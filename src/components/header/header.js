import React from 'react';
import logo from '../../images/monochrome - white@4x.png';
import question from '../../images/header-question.png';
import settings from '../../images/settings-icon.png';
import {Link, withRouter} from "react-router-dom";

import './header.css';

const Header = (props) => {
    return (
        <div className="Header">

            <div className="container block">
                <Link className="navbar-brand" to="/">
                    <img src={logo} className="Header-logo" alt="logo"/>
                </Link>

                <div className="menu">
                    <div className={`nav-item  ${props.location.pathname === "/" ? "active" : ""}`}>
                        <Link className="nav-link" to="/help">
                            <img src={question} alt="question"/>
                        </Link>
                    </div>

                    <div className={`nav-item  ${props.location.pathname === "/settings" ? "active" : ""}`}>
                        <Link className="nav-link" to="/settings">
                            <img src={settings} alt="settings"/>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withRouter(Header);
