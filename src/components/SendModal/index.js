import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { CopiedButton } from '../../components'

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

const sampleCopyCode = '691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0ebcrt1qq0znj64a5zukv7yew52zjzmdndch3r0vxu8668691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0ebcrt1qq0znj64a5zukv7yew52zjzmdndch3r0vxu8668691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0ebcrt1qq0znj64a5zukv7yew52zjzmdndch3r0vxu8668'

const checkIcon = <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7.95455 12.9104L4.61364 9.77612L3.5 10.8209L7.95455 15L17.5 6.04478L16.3864 5L7.95455 12.9104Z" fill="white" />
</svg>;

const copyIcon = (color = '#0054F4') => (
  <svg width="11" height="14" viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.84222 14H3.47388C2.83519 14 2.31557 13.4291 2.31557 12.7274V3.81844C2.31557 3.1164 2.83518 2.54524 3.47388 2.54524H9.84222C10.4806 2.54524 11 3.11639 11 3.81844V12.7274C11 13.4291 10.4806 14 9.84222 14ZM3.47388 3.81844V12.7274H9.84222V3.81844H3.47388ZM1.15779 10.1821H1.15721H0V1.27262C0 0.5709 0.51938 0 1.15779 0H8.10554V1.27262H1.15779V10.1815V10.1821Z" fill={color}/>
</svg>
);

function SendModal() {
  const [step, setStep] = useState(1);
  const handleClose = () => {

  };
  return (
    <Modal show={true} onHide={handleClose} className="send-modal">
      <Modal.Body className="custom-modal-body">
        <div className="send-steps">
          {STEPS.map(stepItem => (
            <div className="step-item" key={stepItem.id}>
              <span 
                className={`step-no ${step >= stepItem.id ? 'active' : ''}`}>
                  {step > stepItem.id ? checkIcon : stepItem.id}
              </span>
              <span>{stepItem.title}</span>
            </div>
          ))}
        </div>
        <p>
          Send the Transfer Code below to the Receiver of this transaction. 
          They will need to enter it, to coplete the transfer.
        </p>
        <CopiedButton>
          <div className="transfer-code">
            <span className="copy-note">Click to Copy Transfer Code</span>
            <span className="copy-btn">{copyIcon()}</span>
            <span className="copy-code">
              {sampleCopyCode}
            </span>
          </div>
        </CopiedButton>
        <button className={`confirm-btn`}>
          <span>{copyIcon('#fff')}</span>
          Copy To Continue
        </button>
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
