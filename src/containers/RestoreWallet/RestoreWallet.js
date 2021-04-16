import React, {useState} from 'react';
import {Link} from "react-router-dom";
import { useDispatch } from 'react-redux'

import {setError, walletFromMnemonic} from '../../features/WalletDataSlice'
import { CreateWizardForm } from '../../components'

import  './RestoreWallet.css'

let bip39 = require('bip39');
let Store = window.require('electron-store');

const RestoreWalletPage = (props) => {
  const dispatch = useDispatch();

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
    } catch (e) {
      dispatch(setError({msg: e.message}))
    }
    props.setWalletLoaded(true);
  }

  return (
  <div className="restore-form">
    <CreateWizardForm
      wizardState={state}
      onSubmit={onClickConf}
      setStateWalletName={setStateWalletName}
      setStateWalletPassword={setStateWalletPassword}
      setStateMnemonic={setStateMnemonic}
      submitTitle="Confirm"
    />
    <Link to="/" className="back">
      Back
    </Link>
  </div>
  )
}

export default RestoreWalletPage;
