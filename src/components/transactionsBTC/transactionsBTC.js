import React from 'react';
import '../../containers/Deposite/Deposite.css';
import scan from "../../images/scan-icon.svg";
import icon1 from "../../images/icon1.svg";
import icon2 from "../../images/icon2.svg";
import arrow from "../../images/scan-arrow.svg";

const TransactionsBTC = () => {
    return (
        <div className=" deposit">

            <div className="Body">
                <div className="deposit-scan">
                    <img src={scan} alt="image"/>
                    <div className="deposit-scan-content">
                        <div className="deposit-scan-subtxt">
                            <span>Finish Creating the Statecoin by sending exactly 0.005 BTC to:</span>
                            <span>1 Confirmation</span>
                        </div>
                        <div className="deposit-scan-main">
                            <div className="deposit-scan-main-item">
                                <img src={icon1} alt="icon"/>
                                <span><b>0.005</b> BTC</span>
                            </div>
                            <img src={arrow} alt="arrow"/>
                            <div className="deposit-scan-main-item">
                                <img src={icon2} alt="icon"/>
                                <span><b>32eigCK8QkB4Khe7nE6wHkxMbqke5EkxtB</b></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="Body">
                <div className="deposit-scan">
                    <img src={scan} alt="image"/>
                    <div className="deposit-scan-content">
                        <div className="deposit-scan-subtxt">
                            <span>Finish Creating the Statecoin by sending exactly 0.005 BTC to:</span>
                            <span>1 Confirmation</span>
                        </div>
                        <div className="deposit-scan-main">
                            <div className="deposit-scan-main-item">
                                <img src={icon1} alt="icon"/>
                                <span><b>0.005</b> BTC</span>
                            </div>
                            <img src={arrow} alt="arrow"/>
                            <div className="deposit-scan-main-item">
                                <img src={icon2} alt="icon"/>
                                <span><b>32eigCK8QkB4Khe7nE6wHkxMbqke5EkxtB</b></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TransactionsBTC;
