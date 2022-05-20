import React from 'react';
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import Loading from '../Loading/Loading';
import './ProgressBar.css';

const ProgressBar = () => {

    const progress = useSelector(state => state.walletData).progress;
  
    const fillerStyles = {
      height: '100%',
      width: `${progress.msg}%`,
      backgroundColor: 'var(--primary)',
      borderRadius: 'inherit',
      textAlign: 'right',
      transition : 'width 5s ease',
    }
  
    return (
        <Modal show={ progress.msg !== "" } className={'progress-modal'}>
                <div className={"recovery-txt-container"}>
                    <Loading title = {"Recovering Wallet"} className = {"loading-recovery"}/>
                </div>
            <div className = "progress-container">
                <div style={fillerStyles} >
                    <span className = "progress-filler" >{`${progress.msg}%`}</span>
                </div>
            </div>
        </Modal>
    );
  };
  
  export default ProgressBar;