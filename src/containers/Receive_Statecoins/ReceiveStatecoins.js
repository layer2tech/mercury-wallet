import React, {useState} from 'react';
import './ReceiveStatecoins.css';

import {Link, withRouter} from "react-router-dom";
import StdButton from "../../components/buttons/standardButton";
import cyrcle from "../../images/cyrcle-icon.png";
import close from "../../images/close-icon.png";
import number from "../../images/number-icon.png";
import Quantity from "../../components/Quantity/quantity"
import orange from "../../images/wallet-orange.png";
import arrow from "../../images/arrow-up.png"
import scan from "../../images/scan-deposite.png";
import icon2 from "../../images/icon2.png";




const ReceiveStatecoinPage = () => {

    return (
        <div className="container ">
            <div className="Body receiveStatecoin">
                <div className="swap-header">
                    <h2 className="WalletAmount">
                        <img src={arrow} alt="arrow"/>
                        Receive Statecoins
                    </h2>
                    <div>
                        <Link className="nav-link" to="/">
                            <StdButton
                                label="Back"
                                className="Body-button transparent"/>
                        </Link>
                    </div>
                </div>
                <h3 className="subtitle">
                    Use your address below to receive Statecoins
                </h3>


            </div>

            <div className="receiveStatecoin content">
                <div className="Body">
                    <div className="receiveStatecoin-scan">
                        <img src={scan} alt="image"/>
                        <div className="receiveStatecoin-scan-content">
                            <div className="receiveStatecoin-scan-txid">
                                <img src={icon2} alt="icon"/>
                                <span>
                                    026ff25fd651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0ebcrt1qq0znj64a5zukv7yew52zjzmdndch3r0vxu8668
                                </span>
                            </div>
                            <span className="receiveStatecoin-scan-ft-txt">GENERATE ANOTHER ADDRESS</span>
                        </div>
                    </div>
                </div>

            </div>


        </div>
    )
}

export default withRouter(ReceiveStatecoinPage);
