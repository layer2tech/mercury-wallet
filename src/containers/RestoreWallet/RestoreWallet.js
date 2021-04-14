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

  const [mnemonic, setMnemonic] = useState("");
  const onMnemonicChange = (event) => {
    setMnemonic(event.target.value)
  }

  // Confirm mnemonic is valid
  const onClickConf = (event) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      event.preventDefault();
      dispatch(setError({msg: "Invalid mnemonic"}))
    }

    // Create wallet and load into Redux state
    try {
      walletFromMnemonic("restored", "", mnemonic, true)
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
          <input id="Passphrase" type="text" name="mnemonic" value={mnemonic} required placeholder="Mnemonic " onChange={onMnemonicChange}/>
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
