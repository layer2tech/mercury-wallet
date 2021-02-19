import React, {useState} from 'react';
import logo from '../../images/monochrome - white@4x.png';
import question from '../../images/header-question.png';
import settings from '../../images/settings-icon.png';
import {Link, withRouter} from "react-router-dom";

import {Button, Modal} from "react-bootstrap";
import {useDispatch, useSelector} from 'react-redux'

import {setErrorSeen} from '../../features/WalletDataSlice'

import './header.css';

const Header = (props) => {
    const dispatch = useDispatch();
    const error_dialogue = useSelector(state => state.walletData).error_dialogue;

    const handleClose = () => {
        dispatch(setErrorSeen())
    }
    const state = useState(false);
    const hide = state[0];
    const bar = state[1]
    const [show, setShow] = useState(false);
    const handleCloseNotofication = () => setShow(false);
    const handleShowNotofication = () => setShow(true);

    return (
        <div className="Header">

            <div className="container block">
                <Link className="navbar-brand" to="/home">
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

                    <div className="nav-item" onClick={() => bar(hide === false)}>
                        <div className="nav-link">
                            <i className="fa fa-exclamation"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`hideBar  ${!hide ? "disabled" : ""}`}>
                <p><i className="fa fa-exclamation"></i> Notification bar</p>
                <div className="close" onClick={() => bar(hide === false)}>
                    <i className="fa fa-close"></i>
                </div>
            </div>

            <Modal show={!error_dialogue.seen} onHide={handleClose} className="modal">

                <Modal.Body>
                    <div className="alert alert-danger" role="alert">
                        {error_dialogue.msg}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>

                </Modal.Footer>
            </Modal>
            <Modal show={show} onHide={handleCloseNotofication} className="modal">
                <Modal.Body>
                    <div>
                        Notification Modal
                    </div>

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseNotofication}>
                        Close
                    </Button>

                </Modal.Footer>
            </Modal>

        </div>
    );
}

export default withRouter(Header);
