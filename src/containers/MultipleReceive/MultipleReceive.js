import React, { useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';


const MultipleReceive = (props) => {

    const [disable, setDisabled] = useState(false); // used on being able to submit a value in modal

    const [receiveAddrs, setReceiveAddrs] = useState(1);
    //delete
    const [error, setError] = useState(null); // error messages to display to the user

    const customInputRef = useRef();

    const onChange = (e) => {
        let value = e.target.value;
        if( value < 0 ){
            setError("Enter a Positive Value")
            return
        }
        else if(value > 1000){
            setError("Over 1000 addresses will be queried.")
        }else{
            setError(null)
        }
        setReceiveAddrs(e.target.value)
    }

    const handleConfirm = () => {
        const customValue = customInputRef.current.value;
        
        props.setNumReceive(receiveAddrs);
        // props.receiveButtonAction();
        props.setReceive(true);
        props.handleClose();
      }

    return(
        <Modal show={props.show} onHide={props.handleClose} className="modal">
        <Modal.Body className="custom-modal-body">
          <div className="selected-item">
            <span>Enter Number of Addresses to Receive</span>
            <input name='depositBtc' type="number" className="custom-smallest" ref={customInputRef} value={receiveAddrs} onChange={ onChange } required/>
            {error && <p className='custom-modal-info alert-danger'> {error} </p>}
          </div>
        </Modal.Body>
        <div className="custom-modal-footer group-btns">
          <button className="Body-button transparent" onClick={props.handleClose}>
            Cancel
          </button>
          <button className={`Body-button ${disable ? 'grey' : 'blue'}`} onClick={handleConfirm} disabled={disable}>
            RECEIVE
          </button>
        </div>
      </Modal>
    )
}

export default MultipleReceive;