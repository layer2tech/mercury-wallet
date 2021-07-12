import React from "react";
import { Modal } from "react-bootstrap";

import { CopiedButton } from '../../components'
import { CoinValueIcon, copyIcon, CoinAddressIcon} from './icons'
import { fromSatoshi } from '../../wallet/util'

import "./index.css";

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
            <div className="transfer-code">
              <span className="copy-note">Click to Copy Transfer Code</span>
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
          </div>
          </CopiedButton>
        </>
      </Modal.Body>
    </Modal>
  );
};

export default SendModal;
