import React, {useState} from 'react';
import logo from '../../images/monochrome - white@4x.png';
import question from '../../images/header-question.png';
import settings from '../../images/settings-icon.png';
import {Link, withRouter} from "react-router-dom";

import {Button, Modal} from "react-bootstrap";
import { useDispatch, useSelector } from 'react-redux'

import { setErrorSeen, setError } from '../../features/WalletDataSlice'

import './header.css';

const Header = (props) => {
  const dispatch = useDispatch();
  const error_dialogue = useSelector(state => state.walletData).error_dialogue;

  const handleClose = () => {
    dispatch(setErrorSeen())
  }

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

      </div>
  );
}

export default withRouter(Header);
