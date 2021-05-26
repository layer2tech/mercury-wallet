import React, { cloneElement, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "react-bootstrap";

import "./index.css";

function ConfirmPopup ({ children, onOk, onCancel }) {
  const [showModal, setShowModal] = useState(false);
  const handleClick = () => setShowModal(true);
  const handleClose = () => {
    onCancel && onCancel();
    setShowModal(false);
  };
  const handleConfirm = () => {
    onOk && onOk();
    handleClose();
  };
  return (
    <>
      <Modal show={showModal} onHide={handleClose} className="modal">
        <Modal.Body className="custom-modal-body">
          <p className="confirm-question">Are you sure?</p>
        </Modal.Body>
        <div className="custom-modal-footer group-btns">
          <button className="primary-btn ghost" onClick={handleClose}>
            Cancel
          </button>
          <button className="primary-btn blue" onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </Modal>
      {cloneElement(children, { onClick: handleClick })}
    </>
  );
};

ConfirmPopup.propTypes = {
  children: PropTypes.element,
  onCancel: PropTypes.func,
  onOk: PropTypes.func,
};

export default ConfirmPopup;
