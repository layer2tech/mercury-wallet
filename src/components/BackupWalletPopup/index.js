'use strict';
import React from "react";
import { Modal } from "react-bootstrap";
import { callGetWalletJsonToBackup } from '../../features/WalletDataSlice'
import "./index.css";

function BackupWalletPopup ({ close, show}) {

  const handleConfirm = () => {
    const walletData = callGetWalletJsonToBackup();
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
        <div className="custom-modal-footer group-btns">
          <button className="action-btn-blue" onClick={handleConfirm}>
            Confirm
          </button>
          <button className="action-btn-normal Body-button transparent" onClick={close}>
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
};

export default BackupWalletPopup;
