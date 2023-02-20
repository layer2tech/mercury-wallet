"use strict";
import React, { cloneElement, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import "./index.css";
import { removeAllCoinsFromSwapRecords } from "../../features/WalletDataSlice";
import { truncateText } from "../../wallet/util";

const ConfirmPopup = ({
  children,
  onOk,
  onCancel,
  preCheck = null,
  argsCheck = null,
  isLightning = false
}) => {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [closeText, setCloseText] = useState("Are you sure?");
  const swapRecords = useSelector((state) => state.walletData.swapRecords);
  const withdraw_fee = useSelector((state) => state.walletData).fee_info
    .withdraw;

  useEffect(() => {
    if (children.props.className.includes("true")) {
      setShowModal(false);
    }
  }, [children.props.className, showModal]);

  const handleClick = () => {
    if (preCheck) {
      var stopCall;

      stopCall = preCheck(...argsCheck);
      // Cancel open pop up?

      if (stopCall) {
        // Error in Pop Up call
        return;
      }
    }

    setShowModal(true);
    if (children.props.className === "header-logout") {
      setCloseText("Are you sure you want to log out?");
    } else if (children.props.className.includes("send-action-button")) {
      if (children.props.className.includes("privacy")) {
        setCloseText(
          "Privacy Warning: address reuse against best privacy practice, send anyway?"
        );
      } else if (children.props.className.includes("xpub-key")) {
        let list = children.props.className.split(" ");
        let sendAddr = list[list.length - 1];

        setCloseText(
          `Send statecoin(s) to each of the first ${sendAddr} addresses`
        );
      } else {
        if (isLightning) {
          setCloseText("Confirm send, sats ready to be sent immediately through lightning.");
        } else {
          setCloseText("Confirm send, statecoin ready to be sent immediately.");
        }
      }
    } else if (children.props.className.includes("withdraw-button")) {
      if (children.props.className.includes("withdrawing-warning")) {
        setCloseText(
          "Confirm withdrawal by RBF: Broadcast new transaction with higher fee."
        );
      } else {
        setCloseText(
          "Confirm withdrawal. Withdrawal fee: " + withdraw_fee / 100 + "%"
        );
      }
    } else if (children.props.className.includes("close-invoice")) {
      let list = children.props.className.split(" ");
      let addr = list[list.length - 2];
      let pubKey = list[list.length - 1];
      setCloseText(`Are you sure you want to delete this invoice having address ${truncateText(addr, 10)} and close channel created with pubkey ${truncateText(pubKey, 10)} ?`);
    } else if  (children.props.className.includes("deposit-button")) {
      setCloseText("Are you sure, You want to create this channel?");
    } else if (swapRecords.length > 0) {
      setCloseText("Your swaps will be cancelled, are you sure?");
    } else {
      setCloseText("Are you sure?");
    }
  };
  const handleClose = () => {
    onCancel && onCancel();
    setShowModal(false);
  };
  const handleConfirm = (event) => {
    if (children.props.className === "header-logout") {
      // ensure to delete all recorded swapped coins then close wallet
      dispatch(removeAllCoinsFromSwapRecords());
    }
    onOk && onOk();
    handleClose();
  };

  return (
    <>
      <Modal show={showModal} onHide={handleClose} className="modal">
        <Modal.Body className="custom-modal-body">
          <p className="confirm-question">{closeText}</p>
        </Modal.Body>
        <div className="custom-modal-footer group-btns">
          <button
            className="action-btn-normal Body-button transparent"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            data-cy="modal-close-confirm-btn"
            className="action-btn-blue"
            onClick={handleConfirm}
          >
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
