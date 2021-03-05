import React, {useState} from 'react';
import { Link } from "react-router-dom";
import { useDispatch } from 'react-redux'

import { Storage } from '../../store';
import {setError} from '../../features/WalletDataSlice'

import  './LoadWallet.css'

let Store = window.require('electron-store');
let store = new Storage();

let wallet_name_password_map = store.getWalletNamePasswordMap()

const LoadWalletPage = () => {
  const dispatch = useDispatch();

  const [selected, setSelected] = useState(wallet_name_password_map.length ? wallet_name_password_map[0].name : "")
  const onSelectedChange = (event) => {
    setSelected(event.target.value)
  }
  const [passwordEntered, setPasswordEntered] = useState("")
  const onPasswordChange = (event) => {
    setPasswordEntered(event.target.value)
  }

  // Confirm wallet name and password match
  const onClickConf = (event) => {
    if (passwordEntered!==wallet_name_password_map.find(item => item.name==selected).password) {
      event.preventDefault();
      dispatch(setError({msg: "Incorrect password."}))
    }
  }

  const populateWalletNameOptions = () => {
    return wallet_name_password_map.map((item, index) => (<option key={index} value={item.name}>{item.name}</option>))
  }

  return (
  <div className="memory-form">
    <form>
      {wallet_name_password_map.length ?
        <div>
          <p>Select a wallet to load and input its password </p>

          <select value={selected} onChange={onSelectedChange}>
            {populateWalletNameOptions()}
          </select>

          <div className="inputs-item">
            <input id="Passphrase" type="password" name="password" required
              placeholder="Passphrase "
              value={passwordEntered}
              onChange={onPasswordChange}
                    />
          </div>
          <Link to={"/home/load/"+JSON.stringify({wallet_name: selected})}
            onClick={onClickConf}>
            Continue
          </Link>

        </div>
        :
        <p>No Wallet in memory. Please create a new one.</p>
      }
    </form>
    <Link to="/" className="back">
      Back
    </Link>
  </div>
)
}

export default LoadWalletPage;
