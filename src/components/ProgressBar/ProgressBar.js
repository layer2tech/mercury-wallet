import React from 'react';
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import './ProgressBar.css';

const ProgressBar = () => {

    const progress = useSelector(state => state.walletData).progress;
  
    const fillerStyles = {
      height: '100%',
      width: `${progress.msg}%`,
      backgroundColor: 'var(--primary)',
      borderRadius: 'inherit',
      textAlign: 'right'
    }
  
    return (
        <Modal show={ progress.msg !== "" } className={'progress-modal'}>
            <div className = "progress-container">
                <div style={fillerStyles} >
                    <span className = "progress-filler" >{`${progress.msg}%`}</span>
                </div>
            </div>
        </Modal>
    );
  };
  
  export default ProgressBar;