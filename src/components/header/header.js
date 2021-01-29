import React, {useState} from 'react';
import logo from '../../images/monochrome - white@4x.png';
import question from '../../images/header-question.png';
import settings from '../../images/settings-icon.png';
import {Link, withRouter} from "react-router-dom";

import './header.css';
import {Button, Modal} from "react-bootstrap";

const Header = (props) => {

    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

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

            <Modal show={show} onHide={handleClose} className="modal">

                <Modal.Body>
                    <div className="alert alert-danger" role="alert">
                        This is a danger alert—check it out!
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>

                </Modal.Footer>
            </Modal>

        </div>
    );
}

export default withRouter(Header);
