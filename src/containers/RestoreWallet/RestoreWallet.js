import React, {useState} from 'react';
import {Link} from "react-router-dom";
import { useDispatch } from 'react-redux'

import {setError, walletFromMnemonic} from '../../features/WalletDataSlice'
import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg";

import  './RestoreWallet.css'

let bip39 = require('bip39');
let Store = window.require('electron-store');
let store = new Store();

const RestoreWalletPage = (props) => {
  const [showPass, setShowPass] = useState(false);
  const [checked, setChecked] = useState(false)
  const dispatch = useDispatch();

  const [state, setState] = useState(
    {
      wallet_name: "",
      wallet_password: "",
      mnemonic: "",
    });
  const toggleShowPass = () => setShowPass(!showPass);
  const toggleCheckbox = () => setChecked(!checked);
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
          <input 
            type={showPass ? 'text' : 'password'} name="password"
            name="wallet_password" 
            required placeholder="Password " 
            onChange={setStateWalletPassword}
          />
          <span className={'eye-icon'} onClick={toggleShowPass}>
              {showPass ? <img src={eyeIconOff} /> : <img src={eyeIcon} />}
          </span>
      </div>
      <div className="inputs-item">
          <input id="checkbox" type="checkbox" name="checkbox" required
                  onChange={toggleCheckbox}/>
          <label className="control-label"
                  htmlFor="checkbox"> I confirm that nobody can see my screen and take responsiblity of the security
              of this computer,
              because anyone who has access to my seed key will be able to spend the funds in my wallet.</label>
      </div>

      <div className="btn-confirm-wrap">
        <Link 
          to={"/home"} 
          className={`send  ${!checked ? "disabled" : ""}`}
          onClick={onClickConf}
        >
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
