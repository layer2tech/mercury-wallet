import React, { useCallback, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { callDeleteToken, callGetTokens } from '../../features/WalletDataSlice';
import DepositToken from '../DepositToken/DepositToken';

const PayOnDeposit = () => {
    // deleting coins
    const [currentItem, setCurrentItem] = useState(null);
    const [showConfirmCoinAction, setConfirmCoinAction] = useState({show: false, msg: ""});

    const confirmDelete = useCallback((item) => {
        setCurrentItem(item);
        setConfirmCoinAction({...showConfirmCoinAction, 
          show: true, 
          msg: "Are you sure you want to delete this token ?",
          yes: handleDeleteToken,
          no: handleCloseModal
        });
      }, [setCurrentItem, setConfirmCoinAction])
    
    const handleCloseModal = () => {
        setConfirmCoinAction({ show: false});
    }

    const handleDeleteToken = async (token_id) => {
        // Add await delete token
        await callDeleteToken(token_id);
        setConfirmCoinAction({ show: false});
    }
    
    return(
        <div className = 'pod-container'>
            {callGetTokens()?.map(token => {
                console.log(token)
                if(token.values.length > 0){
                    return(
                        <div className = 'pod-token' key = { token.token.id } >
                            < DepositToken 
                                token = { token }
                                confirmDelete = { confirmDelete } />
                        </div>
                    )
                }
            })}
             <Modal
                show={showConfirmCoinAction.show}
                onHide={handleCloseModal}
                className="modal coin-details-modal"
            >
                <Modal.Body>
                <div>
                    {showConfirmCoinAction.msg}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        className="Body-button transparent"
                        onClick={async () => await showConfirmCoinAction.yes(currentItem)}
                    >
                        Yes
                    </Button>
                    <Button
                        className="Body-button transparent"
                        onClick={showConfirmCoinAction.no}
                    >
                        No
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default PayOnDeposit;