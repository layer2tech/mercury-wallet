import key from '../../images/key-blue-img.png';
import restore from '../../images/restore-red-img.png';
import secure from '../../images/secure-blue-img.png';
import store_img from '../../images/store-red-img.png';

import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";
import { useDispatch } from 'react-redux'

import { setError } from '../../features/WalletDataSlice'

import './CreateWalletInfo.css'

let Store = window.require('electron-store');
let store = new Store();

const CreateWalletInfoPage = () => {
    const dispatch = useDispatch();

    const state = useState(false);
    const checked = state[0];
    const changeCheckbox = state[1]
    // Change handlers

    const [warningSeen, setWarningSeen] = useState(false);

    // If wallet saved warn of overwriting data
    const checkWalletStored = () => {
      if (Object.keys(store.get('wallet')).length) {
        return true
      }
      return false
    }
    if (!warningSeen && checkWalletStored()) {
      setWarningSeen(true);
      dispatch(setError({msg: "Warning: Creating a new wallet will overwrite your current wallet."}))
    }

    return (
        <div className="welcome-second ">
            <h1>Create a New Wallet</h1>
            <div className="create-welcome">
                <div className="create-welcome-item">
                    <img src={secure} alt="secure"/>
                    <p>The 12 word seed key shown in the next view provides access to your wallet. Copy and store it
                        somewhere safe.</p>
                </div>
                <div className="create-welcome-item">
                    <img src={store_img} alt="store"/>
                    <p>Never store it online or on the same computer as the wallet.</p>
                </div>
                <div className="create-welcome-item">
                    <img src={key} alt="key"/>
                    <p>The seed key is the only way to recover your wallet
                        if your computer is lost, stolen or stops working. </p>
                </div>
                <div className="create-welcome-item">
                    <img src={restore} alt="restore"/>
                    <p>There is no way to recover the seed if lost.</p>
                </div>

            </div>
            <div className="inputs-item">
                <input id="checkbox" type="checkbox" name="checkbox" required
                       onChange={() => changeCheckbox(!checked)}/>
                <label className="control-label"
                       htmlFor="address"> I confirm that nobody can see my screen and take responsiblity of the security
                    of this computer,
                    because anyone who has access to my seed key will be able to spend the funds in my wallet.</label>
            </div>
            <div className="btns">
                <Link to="/">
                    go back
                </Link>
                <Link to="/create_wizard" className={`send  ${!checked ? "disabled" : ""}`}>
                    Continue
                </Link>
            </div>
        </div>
    )
}

export default withRouter(CreateWalletInfoPage);
