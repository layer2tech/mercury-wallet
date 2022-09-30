'use strict';
import { useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { showWarning, dontShowWarning, setOneOffMsgSeen } from '../../features/WalletDataSlice';
import Modal from "react-bootstrap/Modal";
import './OneOffMessage.css';

// This is a standard notification with option to never show again, that saves to wallet
// To implement a new notification, add a notif name to the wallet object of notifications
// Set notification to show on Boolean

const OneOffMessage =  () => {
  const dispatch = useDispatch()
  const [dontShow,setDontShow] = useState(false)

  const one_off_msg = useSelector(state => state.walletData).one_off_msg;

  const toggleDontShow = () => setDontShow(!dontShow)

  const handleClose = () => {
    dispatch(setOneOffMsgSeen())
  }

  const handleConfirm = async () => {
    //ensure tickbox pushes data to wallet or redux state?
    if(dontShow) await dontShowWarning(one_off_msg.key)
      
    handleClose()
  };
  
  return(
  <>
      <Modal show={one_off_msg.key !== "" && !one_off_msg.seen && showWarning(one_off_msg.key) } onHide={() => handleClose()} className="modal">
        <Modal.Body className="custom-modal-body">
          <p className="confirm-question">{one_off_msg.msg}</p>
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

export default OneOffMessage;