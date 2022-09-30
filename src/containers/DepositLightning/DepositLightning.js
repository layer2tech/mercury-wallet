import PageHeader from "../PageHeader/PageHeader";
import CoinDescription from "../../components/inputs/CoinDescription/CoinDescription";

import plus from "../../images/plus-deposit.png";
import btc_img from "../../images/icon1.png";
import arrow_img from "../../images/scan-arrow.png";
import copy_img from "../../images/icon2.png";

import { CopiedButton } from "../../components";
import { fromSatoshi } from "../../wallet";

import './DepositLightning.css';



const DepositLightning = (props) => {

    return (
        <div className = "container deposit-ln">
            <PageHeader 
                title = "Create Channel"
                className = "create-channel"
                icon = {plus}
                subTitle = "Deposit BTC in channel to a Bitcoin address" />

            <div className="Body">
                <div className="deposit-scan">
        
                <div className="deposit-scan-content">
                    <div className="deposit-scan-subtxt">

                        <CoinDescription
                            dscrpnConfirm={() => {}}
                            description={""}
                            handleChange={() => {}}
                            setDscrpnConfirm={() => {}} />

                    </div>
        
                    <div className="deposit-scan-main">
                        <div className="deposit-scan-main-item">
                            <img src={btc_img} alt="icon" />
                            <span><b>{fromSatoshi(5000000)}</b> BTC</span>
                        </div>
                    <img src={arrow_img} alt="arrow" />
                    <div className="deposit-scan-main-item">

                        <>
                            <CopiedButton handleCopy={ () => {} }>
                                <img type="button" src={copy_img} alt="icon" />
                            </CopiedButton>
                            <span className="long"><b>bc1qjfyxceatrh04me73f67sj7eerzx4qqq4mewscs</b></span>
                        </>
                    </div>
                    </div>
        
                </div>
                </div>
                <span className="deposit-text">Create statecoin by sending {fromSatoshi(5000000)} BTC to the above address in a SINGLE transaction</span>
            </div>
        </div>
    )
}

export default DepositLightning;
  