import plus from '../../images/plus-black.png';
import restore from '../../images/restore-img.png';
import check from '../../images/icon-action-check_circle.png';
import StdButton from "../../components/buttons/standardButton";
import swapIcon from "../../images/swap-icon.png";

import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";

import './Welcome.css'

const Welcome = () => {
    const state = useState(0);
    const checked = state[0];
    const changeCheckbox = state[1]

    return (
        <div className="welcome-first">
            <div>
                <h1>Welcome to Mercury</h1>
                <p>If you’re using Bitcoin for the first time, or are new to the privacy solutions by Mercury create a
                    new wallet.
                    If you already have an existing wallet, use your seed phrase to restore the wallet.</p>
            </div>
            <div className="welcome-btns">
                <div onClick={() => changeCheckbox(1)} className={`${checked === 1 ? "selected" : ""}`}>
                    <img src={plus} alt="plus"/>
                    <span>Create a New Wallet</span>
                    <img className="check-img" src={check} alt="plus"/>
                </div>
                <div onClick={() => changeCheckbox(2)} className={`${checked === 2 ? "selected" : ""}`}>
                    <img src={restore} alt="restore"/>
                    <span>Restore an Existing Wallet</span>
                    <img className="check-img" src={check} alt="plus"/>
                </div>

                <div onClick={() => changeCheckbox(3)} className={`${checked === 3 ? "selected" : ""}`}>
                    <img src={restore} alt="restore"/>
                    <span>Load From Memory</span>
                    <img className="check-img" src={check} alt="plus"/>
                </div>
            </div>
            <Link to={`${checked === 1 ? "create_wallet" : checked === 2 ? "create_wallet" : "memory_form"}`}
                  className={`send  ${!checked ? "disabled" : ""}`}>
                Continue
            </Link>
        </div>
    )
}

export default withRouter(Welcome);
