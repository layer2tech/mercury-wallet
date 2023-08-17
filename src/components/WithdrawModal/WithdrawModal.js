import { Modal, Spinner } from 'react-bootstrap';
import CopiedButton from '../CopiedButton/CopiedButton';
import { useEffect, useState } from 'react';
import icon2 from "../../images/icon2.png";
import {useSelector, useDispatch} from 'react-redux';
import {
  setShowWithdrawPopup,
  setWithdrawTxid
} from "../../features/WalletDataSlice";


const WithdrawModal = () => {

  const dispatch = useDispatch();

  const showWithdrawPopup = useSelector((state) => state.walletData).showWithdrawPopup;
  const withdraw_txid = useSelector((state) => state.walletData).withdraw_txid;
  
  const handleClose = () => {
    dispatch(setShowWithdrawPopup(!showWithdrawPopup));
    dispatch(setWithdrawTxid(""));
  }

  const copyTxIDToClipboard = () => {
    navigator.clipboard.writeText(withdraw_txid);
  }

    return (
        <Modal show ={showWithdrawPopup} 
          onHide = {() => {
            dispatch(setShowWithdrawPopup(!showWithdrawPopup));
            dispatch(setWithdrawTxid(""));
          }}
          className={"withdraw-modal"}>
        <Modal.Body className={"modal-body"}>
          
          {withdraw_txid === "" ? (
            <div className = "loading-container">
              <div className = "loading-spinner"  ><Spinner animation="border" style = {{color: "var(--primary)"}} variant="primary" ></Spinner></div>
              <div className = "loading-txt" >Loading Withdrawal Transaction ID...</div>
            </div>  
          ):(
          <div>
            <div className={"withdrawal-confirm"}>
              <h3>Withdrawal confirmation.</h3>
              <div className={"txid-container"}>
                <span>TX ID: </span>
                <CopiedButton handleCopy={() => copyTxIDToClipboard()}>
                  <div className="copy-hex-wrap">
                    <img type="button" src={icon2} alt="icon"/>
                    <span>
                      {withdraw_txid}
                    </span>
                  </div>
                </CopiedButton>
              </div>
            </div>
            <button onClick={() => handleClose()}
              className={`confirm-btn`}
            >
              Continue
            </button>
          </div>)}
          
        </Modal.Body>
      </Modal>
    );
};

export default WithdrawModal;