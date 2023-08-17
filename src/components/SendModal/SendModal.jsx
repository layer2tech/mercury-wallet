'use strict';
import { Modal, Spinner} from "react-bootstrap";
import { CopiedButton } from '..';
import { CoinValueIcon, copyIcon, CoinAddressIcon} from './Icons';
import { fromSatoshi } from '../../wallet/util';

import "./index.css";

const SendModal = ({
  transfer_code = '',
  value = 0,
  coinAddress = '',
  show = false,
  onClose = () => false,
}) => {

  const handleClose = () => {
    // TODO: call cancel transfer_sender here.
    onClose();
  };

  const handleCopy = (e) => {
    navigator.clipboard.writeText(e.target.innerText);
  };

  const tooltipHover = (e) => {
    var tooltipSpan = document.querySelector('.transfer-code span.tooltip');
    if (tooltipSpan !== null) {
      var w = window.innerWidth;
      var h = window.innerHeight;

      var x = e.clientX;
      var y = e.clientY;

      tooltipSpan.style.top = `${y + 16}px`;

      if (x >= w - 370) {
        tooltipSpan.style.left = `${w - 370 + 72}px`;
      }
      else {
        tooltipSpan.style.left = `${x + 72}px`;
      }

      if (x >= w - 120 && tooltipSpan.classList.contains("available")) {
        tooltipSpan.style.left = `${w - 120 + 72}px`;
      }
      else {
        tooltipSpan.style.left = `${x + 72}px`;
      }
    }
  }
  // TO DO: Tooltip Follow Mouse

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
          {transfer_code === "" || !transfer_code ? (
            <div className = "loading-container">
              <div className = "loading-spinner"  ><Spinner animation="border" style = {{color: "var(--primary)"}} variant="primary" ></Spinner></div>
              <div className = "loading-txt" >Loading transfer key...</div>
            </div>  
          ):(
            transfer_code.map(msg => {
              return(
              <CopiedButton
                    handleCopy={handleCopy}
                    style={{
                      backgroundColor: 'var(--button-border)',
                      borderRadius: 5,
                      boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.101961)',
                      bottom: 80,
                      width: 'max-content',
                      padding: '5px 12px',
                      color: 'var(--text-primary)',
                      fontWeight: 'bold',
                      top: 'initial',
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}
                    message='Copied to Clipboard'
                >
                  <div>
                    <div>
                      <div className="transfer-code" > {/*  onMouseMove={e => tooltipHover(e)} */}
                        <span className="tooltip">
                          <b>Transfer Key:</b> Send the receiver the transfer key to 'RECEIVE WITH KEY'
                        </span>
                        <span className="copy-note">Click to Copy Transfer Key</span>
                        <span className="copy-btn">{copyIcon()}</span>
                        <span className="copy-code">
                          {msg}
                        </span>
                      </div>
                    </div>
                  </div>
                </CopiedButton>
              )
            }))}
          <button onClick={handleClose}
            className={`confirm-btn`}
          >
            {/* <span>{copyIcon('var(--link-color)')}</span> */}
            Continue
          </button>
        </>
      </Modal.Body>
    </Modal>
  );
};

export default SendModal;
