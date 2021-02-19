import React, {useState} from 'react';
import logo from '../../images/monochrome - white@4x.png';
import question from '../../images/header-question.png';
import settings from '../../images/settings-icon.png';
import {Link, withRouter} from "react-router-dom";

import {Button, Modal} from "react-bootstrap";
import {useDispatch, useSelector} from 'react-redux'

import {setErrorSeen, setNotificationSeen, setNotification} from '../../features/WalletDataSlice'

import './header.css';

const Header = (props) => {
    const dispatch = useDispatch();
    const notification_dialogue = useSelector(state => state.walletData).notification_dialogue;
    const error_dialogue = useSelector(state => state.walletData).error_dialogue;

    let notifications_list = notification_dialogue;

    const handleCloseError = () => {
        dispatch(setErrorSeen())
    }
    const handleCloseNotification = (msg) => {
      // remove notificaiton message from WalletData state and local state
      dispatch(setNotificationSeen({msg: msg}))
      let new_notifications_list = notifications_list.filter((item) => {
        if (item.msg !== msg) { return item }
      })
      notifications_list = new_notifications_list;
    }

    const handleShowNotofication = () => {
      dispatch(setNotification({msg:"test"}))
    }


    // Display all notifications
    const showNotifications = notifications_list.map((item) => (
      <NotificationBar msg={item.msg} handleCloseNotification={handleCloseNotification}/>
    ));

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

                </div>
            </div>

            {showNotifications}

            <Modal show={!error_dialogue.seen} onHide={handleCloseError} className="modal">
                <Modal.Body>
                    <div className="alert alert-danger" role="alert">
                        {error_dialogue.msg}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseError}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
}

const NotificationBar = (props) => {
  return (
    <div className={`hideBar  ${false ? "disabled" : ""}`}>
        <p><i className="fa fa-exclamation"></i> {props.msg}</p>
        <div className="close" onClick={() => props.handleCloseNotification(props.msg)}>
            <i className="fa fa-close"></i>
        </div>
    </div>
  )
}

export default withRouter(Header);
