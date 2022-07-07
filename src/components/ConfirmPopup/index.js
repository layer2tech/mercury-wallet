'use strict';
import React, { cloneElement, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from 'react-redux';
import "./index.css";
import {
  removeAllCoinsFromSwapRecords
} from "../../features/WalletDataSlice";

const ConfirmPopup = ({ children, onOk, onCancel }) => {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [closeText, setCloseText] = useState('Are you sure?');
  const swapRecords = useSelector(state => state.walletData.swapRecords);
  const withdraw_fee = useSelector(state => state.walletData).fee_info.withdraw;

  useEffect(()=> {

    if(children.props.className.includes('true')){
      setShowModal(false)
    }

  },[children.props.className,showModal])
  
  const handleClick = () => {
    setShowModal(true);
    if(children.props.className === 'header-logout'){
      setCloseText('Are you sure you want to log out?')
    } else if(children.props.className.includes('send-action-button')){
      if(children.props.className.includes('privacy')){
        setCloseText('Privacy Warning: Address reuse against best privacy practice, send anyway?')
      } else{
        setCloseText('Confirm send, statecoin ready to be sent immediately.')
      }
    } else if(children.props.className.includes('withdraw-button')){
      if(children.props.className.includes("withdrawing-warning")){
        setCloseText('Confirm withdrawal by RBF: Broadcast new transaction with higher fee.')
      }else{
        setCloseText('Confirm withdrawal. Withdrawal fee: ' + withdraw_fee/100 + '%')
      }
    } else if(swapRecords.length > 0){
      setCloseText('Your swaps will be cancelled, are you sure?');
    } 
    else{
      setCloseText('Are you sure?')
    }
  }
  const handleClose = () => {
    onCancel && onCancel();
    setShowModal(false);
  };
  const handleConfirm = (event) => {
    if(children.props.className === 'header-logout'){
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
          <button className="action-btn-normal Body-button transparent" onClick={handleClose}>
            Cancel
          </button>
          <button className="action-btn-blue" onClick={handleConfirm}>
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
