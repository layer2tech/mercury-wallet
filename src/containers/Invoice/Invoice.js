import btc_img from "../../images/icon1.png";
import arrow_img from "../../images/scan-arrow.png";
import copy_img from "../../images/icon2.png";

import { CopiedButton } from "../../components";
import QRCodeGenerator from '../../components/QRCodeGenerator/QRCodeGenerator';

import '../DepositLightning/DepositLightning.css';
import "./Invoice.css";

const Invoice = (props) => {

    const formatTime = (seconds) => {
        let min = Math.floor(seconds / 60);
        let sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? "0" : ""}${sec}`;
    }

    const copyAddressToClipboard = (event, address) => {
        event.stopPropagation()
        navigator.clipboard.writeText(address);
    }    
    
    return (
        <div className="Body">
            {(props.expTime) ?
                <span>Expires in {formatTime(props.expTime)}</span>
                : <span>Expired</span>}
            <div className="deposit-scan">

                <QRCodeGenerator address={props.addr} amount={props.amt}
                level='H' />

            <div className="deposit-scan-content">
                <div className="deposit-scan-subtxt">

                <span>{props.desc}</span>

                </div>

                <div className="deposit-scan-main">
                    <div className="deposit-scan-main-item">
                        <img src={btc_img} alt="icon" />
                        <span><b>{props.amt}</b> Sats</span>
                    </div>
                <img src={arrow_img} alt="arrow" />
                <div className="deposit-scan-main-item">

                    <>
                        <CopiedButton handleCopy={ (event) => copyAddressToClipboard(event, props.addr) }>
                            <img type="button" src={copy_img} alt="icon" />
                        </CopiedButton>
                        <span className="long lightning"><b>{props.addr}</b></span>
                    </>
                </div>
                </div>

            </div>
            </div>
            <span className="deposit-text">Send this invoice to sender to receive {props.amt} Sats</span>
        </div>
    );
};

export default Invoice;