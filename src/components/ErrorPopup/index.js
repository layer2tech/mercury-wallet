'use strict';
import React from "react";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { setErrorSeen } from "../../features/WalletDataSlice";

import "./index.css";

function ErrorPopup () {
  const dispatch = useDispatch();
  const error_dialogue = useSelector(state => state.walletData).error_dialogue;
  const handleCloseError = () => dispatch(setErrorSeen());
  return (
    <>
      <Modal show={!error_dialogue.seen} onHide={handleCloseError} className="modal">
        <Modal.Body className="custom-modal-body">
          <p className="custom-modal-info alert-danger">{error_dialogue.msg}</p>
        </Modal.Body>
        <div className="custom-modal-footer group-btns">
          <button className="action-btn-normal Body-button transparent" onClick={handleCloseError}>
            Close
          </button>
        </div>
      </Modal>
    </>
  );
};

export default ErrorPopup;
