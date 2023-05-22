import { Modal } from 'react-bootstrap';
import {useSelector, useDispatch} from 'react-redux';
import {
  setChannelClosePopup,
} from "../../features/WalletDataSlice";


const ChannelClosePopup = () => {

  const dispatch = useDispatch();

  const showChannelClosePopup = useSelector((state) => state.walletData).showChannelClosePopup;
  
  const handleClose = () => {
    dispatch(setChannelClosePopup(!showChannelClosePopup));
  }

    return (
        <Modal show ={showChannelClosePopup} 
          onHide = {() => {
            dispatch(setShowWithdrawPopup(!showChannelClosePopup));
          }}
          className={"withdraw-modal"}>
        <Modal.Body className={"modal-body"}>
          <div>
            <div className={"withdrawal-confirm"}>
              <h4>Channel closed successfully !</h4>
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

export default ChannelClosePopup;