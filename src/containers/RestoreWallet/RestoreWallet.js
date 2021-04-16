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

  // Confirm mnemonic is valid
  const onClickConf = (event) => {
    if (!bip39.validateMnemonic(state.mnemonic)) {
      event.preventDefault();
      dispatch(setError({msg: "Invalid mnemonic"}))
    }

    // Create wallet and load into Redux state
    try {
      walletFromMnemonic(state.wallet_name, state.wallet_password, state.mnemonic, true)
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
          <input type="text" name="mnemonic" required placeholder="Mnemonic " onChange={setStateMnemonic}/>
      </div>

      <div className="inputs-item">
          <input type="text" name="wallet_name" required placeholder="Wallet Name " onChange={setStateWalletName}/>
      </div>

      <div className="inputs-item">
          <input type="password" name="wallet_password" required placeholder="Password " onChange={setStateWalletPassword}/>
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
