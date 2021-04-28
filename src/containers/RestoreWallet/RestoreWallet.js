import React, {useState} from 'react';
import {Link, withRouter } from "react-router-dom";
import { useDispatch } from 'react-redux'
import {setError, walletFromMnemonic} from '../../features/WalletDataSlice'
import { CreateWizardForm } from '../../components'
import {Storage} from '../../store';

import  './RestoreWallet.css'

let bip39 = require('bip39');
let store = new Storage();

const RestoreWalletPage = (props) => {
  const dispatch = useDispatch();

  let wallet_names = store.getWalletNames();

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
    if (wallet_names.indexOf(state.wallet_name)!=-1) {
      dispatch(setError({msg: "Wallet with name "+state.wallet_name+" already exists."}))
      return
    }

    if (!bip39.validateMnemonic(state.mnemonic)) {
      dispatch(setError({msg: "Invalid mnemonic"}))
      return
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

export default withRouter(RestoreWalletPage);
