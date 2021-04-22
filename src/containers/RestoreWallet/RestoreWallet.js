import React, {useState, useEffect} from 'react';
import {Link, withRouter } from "react-router-dom";
import { useDispatch } from 'react-redux';
import {Tabs, Tab} from 'react-bootstrap';
import {setError, walletFromMnemonic} from '../../features/WalletDataSlice'
import { CreateWizardForm } from '../../components'
import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg"

import  './RestoreWallet.css'

let bip39 = require('bip39');
let Store = window.require('electron-store');

const RestoreWalletPage = (props) => {
  const dispatch = useDispatch();
  const [showPass, setShowPass] = useState(false);
  const toggleShowPass = () => setShowPass(!showPass);

  const [state, setState] = useState(
    {
      wallet_name: "",
      wallet_password: "",
      mnemonic: "",
    });
  const setStateWalletName = (event) => setState({...state, wallet_name: event.target.value});
  const setStateWalletPassword = (event) => setState({...state, wallet_password: event.target.value});
  const setStateMnemonic = (event) => setState({...state, mnemonic: event.target.value});

  // Confirm mnemonic is valid
  const onClickConf = () => {
    if (!bip39.validateMnemonic(state.mnemonic)) {
      dispatch(setError({msg: "Invalid mnemonic"}))
    }

    // Create wallet and load into Redux state
    try {
      walletFromMnemonic(state.wallet_name, state.wallet_password, state.mnemonic, true)
      props.history.push('/home')
    } catch (e) {
      dispatch(setError({msg: e.message}))
    }
    props.setWalletLoaded(true);
  }

  const handleSelectBackupFile = () => {
    window.postMessage({
      type: 'select-backup-file'
    })
  }

  const handleImportWalletData = (event, backupData) => {
    try {
      const jsonData = JSON.parse(backupData);
      console.log(jsonData);
      alert(backupData)
    } catch (error) {
      dispatch(setError({msg: "Invalid Backup File Format"}))
    }
  }

  useEffect(() => {
    window.electron.ipcRenderer.on('received-backup-data', handleImportWalletData);
    return () => window.electron.ipcRenderer.removeListener('received-backup-data', handleImportWalletData);
  }, [])

  return (
    <div className="restore-wallet-wrap">
      <Tabs defaultActiveKey={'Restore from Seed'}>
          <Tab eventKey={'Restore from Seed'} title={'Restore from Seed'}>
            <div className="restore-form">
              <CreateWizardForm
                wizardState={state}
                onSubmit={onClickConf}
                setStateWalletName={setStateWalletName}
                setStateWalletPassword={setStateWalletPassword}
                setStateMnemonic={setStateMnemonic}
                submitTitle="Confirm"
              />
            </div>
          </Tab>
          <Tab eventKey="Restore from Backup" title="Restore from Backup">
            <div className="restore-form">
              <div className="inputs-item">
                <input 
                  type={showPass ? 'text' : 'password'} name="password"
                  placeholder="Passphrase"
                  onChange={setStateWalletPassword}
                />
                <span className={'eye-icon'} onClick={toggleShowPass}>
                    {showPass ? <img src={eyeIconOff} /> : <img src={eyeIcon} />}
                </span>
              </div>

              <button 
                type="button" 
                onClick={handleSelectBackupFile}
                className="Body-button blue backup-btn">Select Your Backup File</button>
            </div>
          </Tab>
      </Tabs>
      <Link to="/" className="back Body-button bg-transparent">
        Back
      </Link>
    </div>
  )
}

export default withRouter(RestoreWalletPage);
