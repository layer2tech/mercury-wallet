'use strict';
import key from '../../images/key-blue-img.png';
import restore from '../../images/restore-red-img.png';
import secure from '../../images/secure-blue-img.png';
import store_img from '../../images/store-red-img.png';
import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";
import './CreateWalletInfo.css'
import { callGetArgsHasTestnet } from '../../features/WalletDataSlice';

const CreateWalletInfoPage = () => {
    const state = useState(false);
    const checked = state[0];
    const changeCheckbox = state[1]
    // Change handlers

    return (
        <div className="welcome-second ">
            <h1>Create a New Wallet</h1>
            {callGetArgsHasTestnet() && <b><p className="red">IMPORTANT: Wallet was opened in testnet, therefore new wallets will be created in testnet. Existing wallets are not changed.</p></b>}
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
                       htmlFor="checkbox"> I confirm that nobody can see my screen and take responsiblity of the security
                    of this computer,
                    because anyone who has access to my seed key will be able to spend the funds in my wallet.</label>
            </div>
            <div className="footer-step-btns">
                <Link className="primary-btn-link back" to="/">
                    go back
                </Link>
                <Link to="/create_wizard" className={`primary-btn blue  ${!checked ? "disabled" : ""}`}>
                    Continue
                </Link>
            </div>
        </div>
    )
}

export default withRouter(CreateWalletInfoPage);
