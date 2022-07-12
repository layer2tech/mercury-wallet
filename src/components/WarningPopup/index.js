'use strict';
import React, { useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { showWarning, dontShowWarning, setWarningSeen } from '../../features/WalletDataSlice';
import Modal from "react-bootstrap/Modal";
import './index.css';

// This is a standard notification with option to never show again, that saves to wallet
// To implement a new notification, add a notif name to the wallet object of notifications
// Set notification to show on Boolean

const WarningPopup =  () => {
  const dispatch = useDispatch()
  const [dontShow,setDontShow] = useState(false)

  const warning_dialogue = useSelector(state => state.walletData).warning_dialogue;

  const toggleDontShow = () => setDontShow(!dontShow)

  const handleClose = () => {
    dispatch(setWarningSeen())
  }

  const handleConfirm = async () => {
    //ensure tickbox pushes data to wallet or redux state?
    if(dontShow) await dontShowWarning(warning_dialogue.key)
      
    handleClose()
  };
  
  return(
  <>
      <Modal show={warning_dialogue.key !== "" && !warning_dialogue.seen && showWarning(warning_dialogue.key) } onHide={() => handleClose()} className="modal">
        <Modal.Body className="custom-modal-body">
          <p className="confirm-question">{warning_dialogue.msg}</p>
        </Modal.Body>
          <div className="inputs-item checkbox">
            <input id="check-box" type="checkbox" name="reminder" onClick={() => toggleDontShow()}
                required/>
            <label htmlFor="terms">Do not show this message again.</label>
          </div>
        <div className="custom-modal-footer group-btns">
          <button className="action-btn-normal Body-button transparent" onClick={() => handleClose()}>
            Cancel
          </button>
          <button className="action-btn-blue" onClick={async () => await handleConfirm()}>
            Confirm
          </button>
        </div>
      </Modal>
  </>
  )
}

export default WarningPopup;