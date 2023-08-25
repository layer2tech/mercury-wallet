"use strict";
import "./ErrorPopup.css";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { setErrorSeen } from "../../features/WalletDataSlice";

const ErrorPopup = () => {
  const dispatch = useDispatch();
  const error_dialogue = useSelector(
    (state) => state.walletData
  ).error_dialogue;
  const handleCloseError = () => dispatch(setErrorSeen());
  return (
    <>
      <Modal
        show={!error_dialogue.seen}
        onHide={handleCloseError}
        className="modal"
      >
        <Modal.Body className="custom-modal-body">
          <p
            data-cy="custom-modal-info-alert-danger"
            className="custom-modal-info alert-danger"
          >
            {error_dialogue.msg}
          </p>
        </Modal.Body>
        <div className="custom-modal-footer group-btns">
          <button
            data-cy="custom-modal-info-btn-close"
            className="action-btn-normal Body-button transparent"
            onClick={handleCloseError}
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}

export default ErrorPopup;
