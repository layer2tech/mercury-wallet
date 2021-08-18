import {Link, withRouter, Redirect} from "react-router-dom";
import React, {useState} from 'react';
import {useDispatch} from 'react-redux';
import QRCode from 'qrcode.react';
import { Modal } from 'react-bootstrap';
import { BACKUP_STATUS } from '../../wallet/statecoin';
import { isWalletLoaded, 
  setError, 
  callGetCoinBackupTxData, 
  callCreateBackupTxCPFP, 
  callGetConfig } from '../../features/WalletDataSlice';
import {Coins, StdButton, CopiedButton, Tutorial} from "../../components";

import settings from "../../images/settings.png";
import icon2 from "../../images/icon2.png";
import './BackupTx.css';

const DEFAULT_TX_DATA = {tx_backup_hex:"",priv_key_hex:"",key_wif:"",expiry_data:{blocks:"",days:"",months:""}};

const BackupTxPage = () => {
  const dispatch = useDispatch();

  const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id
  const [selectedCoinTxData, setSelectedCoinTxData] = useState(DEFAULT_TX_DATA); // store selected coins shared_key_id
  const [cpfpAddr, setInputAddr] = useState("");
  const [txFee, setTxFee] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates
  // in developer mode.
  if (!isWalletLoaded()) {
    dispatch(setError({msg: "No Wallet loaded."}))
    return <Redirect to="/" />;
  }

  const setSelectedCoinWrapper = (id) => {
    setSelectedCoin(id);
    if (id==null) {
      setSelectedCoinTxData(DEFAULT_TX_DATA)
    } else {
      try {
        const txData = callGetCoinBackupTxData(id);
        setSelectedCoinTxData(txData);
      } catch(error) {
        console.warn('Something wrong with get coin backup tx data', error);
      }
    }
  }

  const onAddrChange = (event) => {
    setInputAddr(event.target.value);
  };

  const onFeeChange = (event) => {
    setTxFee(event.target.value);
  };

  const copyBackupTxHexToClipboard = () => {
    navigator.clipboard.writeText(selectedCoinTxData.tx_backup_hex);
  }
  
  /*
  const copyPrivKeyToClipboard = () => {
    navigator.clipboard.writeText(selectedCoinTxData.priv_key_hex);
  }*/

  const copyKeyWIFToClipboard = () => {
    navigator.clipboard.writeText(selectedCoinTxData.key_wif);
  }

  const closePrivateKeyModal = () => setShowPrivateKey(false);

  const showBackupStatus = (backup_status) => {
    switch (backup_status) {
      case BACKUP_STATUS.CONFIRMED:
        return (
          <span style={{fontWeight: 'bold', color: 'green'}} role='img' aria-label='checkmark'>
            &#9989; {backup_status}
          </span>
        );
      case BACKUP_STATUS.POST_INTERVAL:
      case BACKUP_STATUS.UNBROADCAST:
      case BACKUP_STATUS.IN_MEMPOOL:
        return (
          <span style={{fontWeight: 'bold', color: 'orange'}} role='img' aria-label='warning'>
            &#9888; {backup_status}
          </span>
        );
      case BACKUP_STATUS.TAKEN:
        return (
          <span style={{fontWeight: 'bold', color: 'red'}} role='img' aria-label='cross'>
            &#10062; {backup_status}
          </span>
        );
      default:
        return (
          <span>
            {selectedCoinTxData.backup_status}
          </span>
        );
    }
  }

  const addCPFP = () => {
    // check statechain is chosen
    if (!selectedCoin) {
      dispatch(setError({msg: "Please choose a statecoin."}))
      return;
    }
    if (!cpfpAddr) {
      dispatch(setError({msg: "Please enter a pay to address."}))
      return;
    }
    if (!txFee) {
      dispatch(setError({msg: "Please enter a fee rate."}))
      return;
    }

    let sucess = callCreateBackupTxCPFP({selected_coin: selectedCoin, cpfp_addr: cpfpAddr, fee_rate: txFee});

    if (!sucess) {
      dispatch(setError({msg: "CPFP build error: please check address is correct"}))
      return;
    }

   }

  let current_config;
  try {
     current_config = callGetConfig();
  } catch(error) {
     console.warn('Can not get config', error);
  } 

  return (
    <div className={`${current_config.tutorials ? 'container-with-tutorials' : ''}`}>
      <div className="container ">
        <Modal show={showPrivateKey} onHide={closePrivateKeyModal} className="modal">
          <Modal.Body className="custom-modal-body">
            <div className="private-key-code">
              <span>Private Key WIF:</span>
              <CopiedButton 
                handleCopy={copyKeyWIFToClipboard} 
                style={{
                  left: 0,
                  top: '-13px'
                }}
              >
                <div>
                  <img type="button" src={icon2} alt="icon"/>
                  <span>{selectedCoinTxData.key_wif}</span>
                </div>
              </CopiedButton>
            </div>
            <div className="private-key-qrcode">
              <QRCode value={selectedCoinTxData.key_wif} level='H' />
            </div>
          </Modal.Body>
          <div className="custom-modal-footer">
            <button className="Body-button bg-transparent" onClick={closePrivateKeyModal}>
              Close
            </button>
          </div>
        </Modal>
          <div className="Body backupTx">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={settings} alt="question"/>
                      Backup Transactions
                  </h2>
                  <div>
                      <Link className="nav-link" to="/settings">
                          <StdButton
                              label="Back"
                              className="Body-button transparent"/>
                      </Link>
                  </div>
              </div>
              <h3 className="subtitle">Select statecoin to view its backup transaction and associated private key</h3>
          </div>

          <div className="backupTx content">
              <div className="Body left ">
                  <div>
                      <span className="sub">Click to select coins below</span>
                      <Coins
                        displayDetailsOnClick={false}
                        selectedCoin={selectedCoin}
                        setSelectedCoin={setSelectedCoinWrapper}/>
                  </div>

              </div>
              <div className="Body right">
                  <div className="header">
                      <span className="sub">Backup Transactions Details</span>
                  </div>

                  <div className="item">
                    <span className="sub">Blocks left:</span>
                      <div className="">
                          <span>
                            {selectedCoinTxData.expiry_data.blocks}
                          </span>
                      </div>
                  </div>

                  <div className="item">
                      <span className="sub">Days left:</span>
                      <div className="">
                          <span>
                            {selectedCoinTxData.expiry_data.days}
                          </span>
                      </div>
                  </div>

                  <div className="item">
                      <span className="sub">Hex:</span>
                      <div className="">
                          {selectedCoinTxData.tx_backup_hex.length > 0 ?
                            <CopiedButton handleCopy={copyBackupTxHexToClipboard}>
                              <div className="copy-hex-wrap">
                                <img type="button" src={icon2} alt="icon"/>
                                <span>
                                  {selectedCoinTxData.tx_backup_hex}
                                </span>
                              </div>
                            </CopiedButton>
                            : null
                          }
                      </div>
                  </div>

                  <div className="item">
                      <span className="sub">Private Key WIF:</span>
                      <div className="">
                        {selectedCoinTxData.key_wif.length > 0 ?
                          (
                            <button 
                              type="buton" 
                              className="show-private-btn blue"
                              onClick={() => setShowPrivateKey(true)}
                            >
                              Show
                            </button>
                          )
                          : null
                        }
                      </div>
                  </div>

                  <div className="item">
                      <span className="sub">Status:</span>
                      <div>
                        {showBackupStatus(selectedCoinTxData.backup_status)}
                      </div>
                  </div>

                  <div className="item">
                      <span className="sub">CPFP:</span>
                      <div>
                          <span>
                            {selectedCoinTxData.cpfp_status}
                          </span>
                      </div>
                  </div>

                  <div className="item">
                      <span className="sub">Pay to:</span>
                      <div>
                        <input
                          value={cpfpAddr}
                          onChange={onAddrChange}
                          placeholder='Send to destination address'
                          smallTxtMsg='Bitcoin Address'
                        />
                      </div>
                  </div>

                  <div className="item">
                      <span className="sub">Fee (sat/b):</span>
                      <div>
                        <input
                        value={txFee}
                        onChange={onFeeChange}
                        placeholder='Fee rate'
                        smallTxtMsg='CPFP Tx Fee'
                        />
                      </div>
                  </div>

                  <div className="item align-right">
                      <button type="button" className="std-button" onClick={addCPFP}>
                          Create CPFP
                      </button>
                  </div>

              </div>
          </div>
      </div>
      {current_config.tutorials && <Tutorial />}
    </div>
  )
}


export default withRouter(BackupTxPage);
