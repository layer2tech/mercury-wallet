import React, {useState} from 'react';
import {Link} from "react-router-dom";
import { useDispatch } from 'react-redux'

import {setError, walletFromMnemonic} from '../../features/WalletDataSlice'

import  './RestoreWallet.css'

let bip39 = require('bip39');
let Store = window.require('electron-store');
let store = new Store();

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

  const onMnemonicChange = (event) => {
    setStateMnemonic(event.target.value)
  }

  // Confirm mnemonic is valid
  const onClickConf = (event) => {
    if (!bip39.validateMnemonic(state.mnemonic)) {
      event.preventDefault();
      dispatch(setError({msg: "Invalid mnemonic"}))
    }

    // Create wallet and load into Redux state
    try {
      walletFromMnemonic("restored", "", state.mnemonic, true)
    } catch (e) {
      event.preventDefault();
      dispatch(setError({msg: e.message}))
    }
    props.setWalletLoaded(true);
  }

  return (
  <div className="restore-form">
    <form>
      <div className="inputs-item">
          <input id="Passphrase" type="text" name="mnemonic" value={state.mnemonic} required placeholder="Mnemonic " onChange={onMnemonicChange}/>
      </div>

      <div >
      <Link to={"/home"} onClick={onClickConf}>
        Confirm
      </Link>
      </div>

    </form>
    <Link to="/" className="back">
      Back
    </Link>
    </div>
  )
}

export default RestoreWalletPage;
