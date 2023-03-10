import { Modal } from 'react-bootstrap';
import CopiedButton from '../CopiedButton';
import icon2 from "../../images/icon2.png";
import {useSelector, useDispatch} from 'react-redux';
import {
    callGetAccount,
    getChannels,
    setShowInvoicePopup
} from "../../features/WalletDataSlice";
import { getBIP32forBtcAddress } from "../../wallet/wallet";
import { useEffect, useState } from "react";


const InvoiceModal = () => {

  const dispatch = useDispatch();

  const [channels, setChannels] = useState(getChannels());

  const showInvoicePopup = useSelector((state) => state.walletData).showInvoicePopup;

  const [private_key, setPrivateKey] = useState('');

  useEffect(() => {
    setChannels(getChannels());
  }, [showInvoicePopup]);

  useEffect(() => {
    if (channels && channels.length > 0) {
        const addr = channels[channels.length-1].funding.addr;
        const bip32 = getBIP32forBtcAddress(addr, callGetAccount());
        const new_private_key = `p2wpkh:${bip32.toWIF()}`;
        setPrivateKey(new_private_key);
    }
  }, [channels]);
  
  const handleClose = () => {
    dispatch(setShowInvoicePopup(!showInvoicePopup));
  }

  const copyTxIDToClipboard = () => {
    navigator.clipboard.writeText(private_key);
  }

    return (
        <Modal show ={showInvoicePopup} 
          onHide = {() => {
            dispatch(setShowInvoicePopup(!showInvoicePopup));
          }}
          className={"withdraw-modal"}>
        <Modal.Body className={"modal-body"}>
          <div>
            <div className={"withdrawal-confirm"}>
              <h3>Private Key:</h3>
              <div className={"txid-container"}>
                <CopiedButton handleCopy={() => copyTxIDToClipboard()}>
                  <div className="copy-hex-wrap">
                    <img type="button" src={icon2} alt="icon"/>
                    <span>
                      {private_key}
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
          </div>
          
        </Modal.Body>
      </Modal>
    );
};

export default InvoiceModal;