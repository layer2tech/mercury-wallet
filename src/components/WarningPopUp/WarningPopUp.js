'use strict';
import { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from 'react-redux';
import { setWarningSeen } from "../../features/WalletDataSlice";
import "./WarningPopUp.css";

const WarningPopup = () => {

    const dispatch = useDispatch();
  
    const warning_dialogue = useSelector(state => state.walletData).warning_dialogue;
  
    const handleClose = () => {
        warning_dialogue.onHide && warning_dialogue.onHide();
        dispatch(setWarningSeen());
    }
  
    const handleConfirm = async () => {
        warning_dialogue.onConfirm && warning_dialogue.onConfirm(warning_dialogue.data);   
        dispatch(setWarningSeen());
    };

  return (
    <Modal show = { warning_dialogue.msg !== "" } onHide={handleClose}>
        <Modal.Body>
            <div>
            {(warning_dialogue.title !== "") &&
                <h3 className="red">{warning_dialogue.title}</h3>}
                <p>{warning_dialogue.msg}</p>
            </div>
        </Modal.Body>
        <Modal.Footer>
            <Button
                className="action-btn-normal Body-button transparent"
                onClick={() => handleConfirm()}>
                    Continue
            </Button>
            <Button
                className="action-btn-normal Body-button transparent"
                onClick={() => handleClose()}>
                    No
            </Button>
        </Modal.Footer>
    </Modal>
  );
};

export default WarningPopup;
