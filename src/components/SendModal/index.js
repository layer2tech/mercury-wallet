import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import {useDispatch} from 'react-redux'

import { CopiedButton } from '../../components'
import {checkWalletPassword, setError, callGetWalletName} from '../../features/WalletDataSlice'
import { CoinValueIcon, checkIcon, copyIcon, LockIcon, CoinAddressIcon} from './icons'
import { fromSatoshi } from '../../wallet/util'

import "./index.css";

const STEPS = [
  {
    id: 1,
    title: 'Copy Transfer Code'
  },
  {
    id: 2,
    title: 'Confirm Transaction'
  },
];

let timeout;

function SendModal({
  transfer_code = '',
  value = 0,
  coinAddress = '',
  show = false,
  close = () => false,
  onConfirm = () => false
}) {
  const dispatch = useDispatch();

  const [step, setStep] = useState(1);
  const [passphrase, setPassphrase] = useState("");
  const handleClose = () => {
    // TODO: call cancel transfer_sender here.
    close()
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(transfer_code);
    timeout = setTimeout(() => {
      setStep(step + 1);
    }, 1000)
  };

  const handlePrivatePassChange = (e) => {
    setPassphrase(e.target.value);
  }
  const handleConfirm = (event) => {
    try { checkWalletPassword(passphrase) }
      catch (e) {
        event.preventDefault();
        dispatch(setError({msg: e.message}))
        return
      }
    onConfirm(passphrase);
  }

  useEffect(() => {
    clearTimeout(timeout);
  }, [step]);

  return (
    <Modal show={show} onHide={handleClose} className="send-modal">
      <Modal.Body className="custom-modal-body">
        <div className="send-steps">
          {STEPS.map(stepItem => (
            <div className={`step-item ${step >= stepItem.id ? 'active' : ''}`} key={stepItem.id}>
              <span
                className={`step-no`}>
                  {step > stepItem.id ? checkIcon : stepItem.id}
              </span>
              <span>{stepItem.title}</span>
            </div>
          ))}
        </div>
        {step === 1 && (
          <>
            <p>
              Send the Transfer Code below to the Receiver of this transaction.
              They will need to enter it to complete the transfer.
            </p>
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
                <button
                  className={`confirm-btn`}
                >
                  <span>{copyIcon('#fff')}</span>
                  Copy To Continue
                </button>
                </div>
            </CopiedButton>
          </>
        )}

        {step === 2 && (
          <>
            <p>
              Enter your private passphrase to confirm the transaction
            </p>
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
            <input
              type="password"
              placeholder="Private Passphrase"
              className="private-passphrase"
              onChange={handlePrivatePassChange}
            />
            <button className={`confirm-btn active step2`} onClick={handleConfirm}>
              <span className="no-scale">{LockIcon}</span>
              CONFIRM TRANSACTION
            </button>
          </>
        )}
        <div className="custom-modal-footer">
          <button className="Body-button bg-transparent" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SendModal;
