import React, { useState, useEffect } from 'react';
import CopiedButton from '../CopiedButton';
import QRCode from 'qrcode.react';
import './DepositToken.css';
import arrow from "../../images/arrow-up.png"

// Add Animation for when button clicked

const DepositToken = (props) => {
    const [showAddress, setShowAddress] = useState(false)
    const [tokenAmount, setTokenAmount] = useState("")

    useEffect(() => {
        console.log("Use Effect Called!")
        console.log("use Effect selected values: ",props.selectedValues)
        if(tokenAmount === ""){
            console.log("Changing token amount");
            const initialValue = 0;
            
            const sumWithInitalValue = props.selectedValues.reduce((prev,curr) => {
                console.log(prev+curr)    
                return prev + curr
            }, initialValue);
            console.log("sum: ", sumWithInitalValue);

            setTokenAmount(sumWithInitalValue * (props.fee/(10000)));
        }
    },[tokenAmount, props.fee, props.selectedValues])
    
    const copyAddressToClipboard = (e) => {
        navigator.clipboard.writeText("rec_sce_addr.sce_address");
    }

    const tooltipHover = (e) => {

        // var tooltipSpan = document.querySelector('.receiveStatecoin-scan-txid span.tooltip');
        // if (tooltipSpan !== null) {
        //     var w = window.innerWidth;
        //     var h = window.innerHeight;

        //     var x = e.clientX;
        //     var y = e.clientY;

        //     tooltipSpan.style.top = `${y + 16}px`;

        //     if (x >= w - 370) {
        //         tooltipSpan.style.left = `${w - 370 + 72}px`;
        //     }
        //     else {
        //         tooltipSpan.style.left = `${x + 72}px`;
        //     }

        //     if (x >= w - 120 && tooltipSpan.classList.contains("available")) {
        //         tooltipSpan.style.left = `${w - 120 + 72}px`;
        //     }
        //     else {
        //         tooltipSpan.style.left = `${x + 72}px`;
        //     }
        // }
    }

    console.log("Token Amount: ",tokenAmount)
    console.log("Sel;ected Values: ",props.selectedValues)

    return(
    <div className="token-deposit receiveStatecoin content">
        <div className="Body">
            <div className="body-title">
                <span className="title">
                    <h1 className="receive-note">Deposit Token</h1>
                    <p>Send AMOUNT BTC to an address below</p>
                </span>
                <span className='token-amount'>
                    <h1 className="receive-note amount">AMOUNT</h1>
                </span>
            </div>
            {showAddress? 
            (
            <div className='back-select'>
                <button
                    type="button"
                    className="Body-button transparent left"
                    onClick={() => setShowAddress(false)}>
                    <img src={arrow} alt="arrow" />
                </button>
            </div>):(null)}

            {showAddress? (
            <div className="receiveStatecoin-scan">
                <div className="receive-qr-code">
                {"rec_sce_addr.sce_address" ? (<QRCode value={"rec_sce_addr.sce_address"} />) : (null)}
                </div>
                <div className="receiveStatecoin-scan-content">
                    <div className="receiveStatecoin-scan-txid" onMouseMove={e => tooltipHover(e)}>
                        <CopiedButton
                        handleCopy={copyAddressToClipboard}
                        style={{
                            bottom: '-30px',
                            top: 'initial',
                            backgroundColor: 'var(--button-border)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: 'var(--text-primary)',
                            fontWeight: 'bold'
                        }}
                        message='Copied to Clipboard'
                        className={"rec_sce_addr.used" === true ? (`copy-btn-wrap used`) : ("copy-btn-wrap")}
                        >
                            <div className="address-index">
                                <div className="address">
                                    <span className="rec-address">
                                        {"ADDRESS IS LISTED HERE"}
                                    </span>
                                </div>
                                <div className="info-receive">
                                    <div className="info-container">
                                        <span className="tooltip-info index">
                                            <div>Token Deposit</div>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CopiedButton>
                    </div>
                </div>
            </div>):(
                <div className='pay-select'>
                    <button className='Body-button token' onClick={() => setShowAddress(true)}>
                        <p>BTC</p>
                    </button>
                    <button className='Body-button token' onClick={() => setShowAddress(true)}>
                        <p>LN</p>
                    </button>
                </div>
            )}
            {/* <div className="receiveStatecoin-scan bottom">
                <div className="receive-qr-code">
                {"rec_sce_addr.sce_address" ? (<QRCode value={"rec_sce_addr.sce_address"} />) : (null)}
                </div>
                <div className="receiveStatecoin-scan-content">
                    <div className="receiveStatecoin-scan-txid" onMouseMove={e => tooltipHover(e)}>
                        <CopiedButton
                        handleCopy={copyAddressToClipboard}
                        style={{
                            bottom: '-30px',
                            top: 'initial',
                            backgroundColor: 'var(--button-border)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: 'var(--text-primary)',
                            fontWeight: 'bold'
                        }}
                        message='Copied to Clipboard'
                        className={"rec_sce_addr.used" === true ? (`copy-btn-wrap used`) : ("copy-btn-wrap")}
                        >
                            <div className="address-index">
                                <div className="address">
                                    <span className="rec-address">
                                        {"ADDRESS IS LISTED HERE"}
                                    </span>
                                </div>
                                <div className="info-receive">
                                    <div className="info-container">
                                        <span className="tooltip-info index">
                                            <div>Token Deposit</div>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CopiedButton>
                    </div>
                </div>
            </div> */}
        </div>
      </div>
    )
}

export default DepositToken;