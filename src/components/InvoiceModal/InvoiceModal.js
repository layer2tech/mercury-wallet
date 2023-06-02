import { Modal } from "react-bootstrap";
import CopiedButton from "../CopiedButton";
import icon2 from "../../images/icon2.png";
import { useSelector, useDispatch } from "react-redux";
import {
  callGetAccount,
  getChannels,
  setShowInvoicePopup,
} from "../../features/WalletDataSlice";
import { getBIP32forBtcAddress } from "../../wallet/wallet";
import { useEffect, useState } from "react";

const InvoiceModal = ({ privatekey }) => {
  const dispatch = useDispatch();

  const showInvoicePopup = useSelector(
    (state) => state.walletData
  ).showInvoicePopup;

  const handleClose = () => {
    dispatch(setShowInvoicePopup(!showInvoicePopup));
  };

  const copyTxIDToClipboard = () => {
    navigator.clipboard.writeText(privatekey);
  };

  return (
    <Modal
      show={showInvoicePopup}
      onHide={() => {
        dispatch(setShowInvoicePopup(!showInvoicePopup));
      }}
      className={"withdraw-modal"}
    >
      <Modal.Body className={"modal-body"}>
        <div>
          <div className={"withdrawal-confirm"}>
            <h3>Private Key:</h3>
            <div className={"txid-container"}>
              <CopiedButton handleCopy={() => copyTxIDToClipboard()}>
                <div className="copy-hex-wrap">
                  <img type="button" src={icon2} alt="icon" />
                  <span>{privatekey}</span>
                </div>
              </CopiedButton>
            </div>
          </div>
          <button onClick={() => handleClose()} className={`confirm-btn`}>
            Continue
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default InvoiceModal;
