import React from "react";
import { Modal } from "react-bootstrap";
import "./index.css";

function BackupWalletPopup ({ close, show}) {

  let walletData = {
    name: 'Sample Wallet Data',
    coins: [
      {
        id: 1,
        value: 5000
      },
      {
        id: 2,
        value: 10000
      },
    ],
    key: 'random key',
    timeout: Date.now()
  }

  const handleConfirm = () => {
    window.postMessage({
      type: 'select-dirs',
      walletData
    });
    close();
  };
  return (
    <>
      <Modal show={show} onHide={close} className="modal">
        <Modal.Body className="custom-modal-body">
          <p className="custom-modal-info alert-danger">
            WARNING: Your wallet backup includes all key information and can be used to steal your funds. Ensure it is stored securely and do not send it to anybody.
          </p>
        </Modal.Body>
        <div className="custom-modal-footer">
          <button className="Body-button blue" onClick={handleConfirm}>
            Confirm
          </button>
          <button className="Body-button bg-transparent" onClick={close}>
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
};

export default BackupWalletPopup;
