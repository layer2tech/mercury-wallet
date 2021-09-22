import plus from '../../images/plus-black.png';
import restore from '../../images/restore-img.png';
import check from '../../images/icon-action-check_circle.png';

import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";

import './Welcome.css'


const Welcome = () => {
    const state = useState(0);
    const checked = state[0];
    const changeCheckbox = state[1];
    const electron = window.require('electron');

    return (
        <div className="welcome-first">
            <div>
                <h1>Welcome to Mercury</h1>
                <br/>
                <p>{JSON.stringify(process.argv)}</p>
                <br/>
                <p>{JSON.stringify(electron.remote.process.argv)}</p>
                <p>testnet address: {JSON.stringify(require('../../network.json').testnet_state_entity_endpoint)}</p>
                
                <p>If you’re using Mercury wallet for the first time, create a
                    new wallet.
                    If you have an existing wallet, load the wallet from your device storage, or use your seed phrase or backup file to restore the wallet.</p>
            </div>
            <div className="welcome-btns">
                <div onClick={() => changeCheckbox(1)} className={`${checked === 1 ? "selected" : ""}`}>
                    <img src={plus} alt="plus"/>
                    <span>Create New Wallet</span>
                    <img className="check-img" src={check} alt="plus"/>
                </div>
                <div onClick={() => changeCheckbox(2)} className={`${checked === 2 ? "selected" : ""}`}>
                    <img src={restore} alt="restore"/>
                    <span>Restore Existing Wallet</span>
                    <img className="check-img" src={check} alt="plus"/>
                </div>

                <div onClick={() => changeCheckbox(3)} className={`${checked === 3 ? "selected" : ""}`}>
                    <img src={restore} alt="restore"/>
                    <span>Load From Memory</span>
                    <img className="check-img" src={check} alt="plus"/>
                </div>
            </div>
            <Link to={`${checked === 1 ? "create_wallet" : checked === 2 ? "restore_wallet" : "load_wallet"}`}
                  className={`send primary-btn blue  ${!checked ? "disabled" : ""}`}>
                Continue
            </Link>
        </div>
    )
}

export default withRouter(Welcome);
