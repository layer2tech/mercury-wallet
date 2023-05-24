import { Modal } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { setSuccessMessageSeen } from "../../features/WalletDataSlice";

const SuccessMessagePopup = () => {
  const dispatch = useDispatch();

  const success_dialogue = useSelector((state) => state.walletData);
  const { msg } = success_dialogue;

  const handleClose = () => {
    dispatch(setSuccessMessageSeen());
  };

  return (
    <Modal show={msg} onHide={handleClose} className="withdraw-modal">
      <Modal.Body className="modal-body">
        <div>
          <div className="withdrawal-confirm">
            <h4>{msg}</h4>
          </div>
          <button onClick={() => handleClose()} className="confirm-btn">
            Continue
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SuccessMessagePopup;
