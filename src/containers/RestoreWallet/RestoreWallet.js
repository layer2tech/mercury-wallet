import React, {useState} from 'react';
import {Link} from "react-router-dom";
import { useDispatch } from 'react-redux'

import { setError } from '../../features/WalletDataSlice'

import  './RestoreWallet.css'

let bip39 = require('bip39');
let Store = window.require('electron-store');
let store = new Store();

const RestoreWalletPage = () => {
  const dispatch = useDispatch();

  const [mnemonic, setMnemonic] = useState("");
  const [warningSeen, setWarningSeen] = useState(false);

  // If wallet saved warn of overwriting data
    const checkWalletStored = () => {
	if (store.get('wallet')) {
	    if (Object.keys(store.get('wallet')).length) {
		return true
	    }
	}
    return false
  }
  if (!warningSeen && checkWalletStored()) {
    setWarningSeen(true);
    dispatch(setError({msg: "Warning: Creating a new wallet will overwrite your current wallet."}));
  }

  const onMnemonicChange = (event) => {
    setMnemonic(event.target.value)
    console.log("mnemonic: ", mnemonic)
  }

  // Confirm mnemonic is valid
  const onClickConf = (event) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      event.preventDefault();
      dispatch(setError({msg: "Invalid mnemonic"}))
    }
  }

  return (
  <div className="memory-form">
    <form>
      <div className="inputs-item">
          <input id="Passphrase" type="text" oname="mnemonic" required placeholder="Mnemonic " onChange={onMnemonicChange}/>
      </div>
      <div>
      <Link to={"/home/mnemonic/"+mnemonic} onClick={onClickConf}>
        Confirm
      </Link>
      </div>
      <Link to="/" >
        Back
      </Link>
    </form>


    </div>
  )
}

export default RestoreWalletPage;
