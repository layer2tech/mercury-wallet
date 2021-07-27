import React, {useEffect} from "react";
import { Modal, Spinner} from "react-bootstrap";

import { CopiedButton } from '../../components'
import { CoinValueIcon, copyIcon, CoinAddressIcon} from './icons'
import { fromSatoshi } from '../../wallet/util'

import "./index.css";
import { propTypes } from "react-bootstrap/esm/Image";

function SendModal({
  transfer_code = '',
  value = 0,
  coinAddress = '',
  show = false,
  onClose = () => false,
}) {


  const handleClose = () => {
    // TODO: call cancel transfer_sender here.
    onClose()
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(transfer_code);
  };

  const tooltipHover = (e) => {
    var tooltipSpan = document.querySelector('.transfer-code span.tooltip');
    var w = window.innerWidth;
    var h = window.innerHeight;

    var x = e.clientX;
    var y = e.clientY;

    tooltipSpan.style.top = `${y-(h/2)+52}px`;
    tooltipSpan.style.left = `${x-(w/2)+250}px`;
  }


  return (
    <Modal show={show} onHide={handleClose} className="send-modal">
      <Modal.Body className="custom-modal-body">
        <>
          <div className="coin-info">
            {CoinValueIcon}
            <div className="coin-content">
              <span>Statecoin Value</span>
              <span>{fromSatoshi(value)} BTC</span>
            </div>
          </div>
          <div className="coin-info">
            {CoinAddressIcon}
            <div className="coin-content">
              <span>Statecoin address</span>
              <span className="coin-address">{coinAddress}</span>
            </div>
          </div>
          <CopiedButton
            handleCopy={handleCopy}
            style={{
              backgroundColor: '#E0E0E0',
              borderRadius: 5,
              boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.101961)',
              bottom: 80,
              width: 'max-content',
              padding: '5px 12px',
              color: '#000',
              fontWeight: 'bold',
              top: 'initial',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
            message='Copied to Clipboard'
        >
          <div>
            {transfer_code === "" ? (
              <div className = "loading-container">
                <div className = "loading-spinner"  ><Spinner animation="border" style = {{color: "#0054F4"}} variant="primary" ></Spinner></div>
                <div className = "loading-txt" >Loading transfer key...</div>
              </div>  
            ):(
            <div>
              <div className="transfer-code" onMouseMove={e => tooltipHover(e)}>
                <span className="tooltip">
                  <b>Transfer Key:</b> Send the receiver the transfer key to 'RECEIVE WITH KEY'
                </span>
                <span className="copy-note">Click to Copy Transfer Key</span>
                <span className="copy-btn">{copyIcon()}</span>
                <span className="copy-code">
                  {transfer_code}
                </span>
              </div>
              <button onClick={handleClose}
                className={`confirm-btn`}
              >
                <span>{copyIcon('#fff')}</span>
                Continue
              </button>
            </div>)}
          </div>
          </CopiedButton>
        </>
      </Modal.Body>
    </Modal>
  );
};

export default SendModal;
