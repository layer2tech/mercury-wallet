import React, {useState} from 'react';
import {Link} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {Storage} from '../../store';
import {walletLoad, setError} from '../../features/WalletDataSlice'

import  './LoadWallet.css'

let store = new Storage();

let wallet_name_password_map = store.getWalletNamePasswordMap()

const LoadWalletPage = (props) => {
  const dispatch = useDispatch();

  const [selectedWallet, setSelected] = useState(wallet_name_password_map.length ? wallet_name_password_map[0].name : "")
  const onSelectedWalletChange = (event) => {
    setSelected(event.target.value)
  }
  const [passwordEntered, setPasswordEntered] = useState("")
  const onPasswordChange = (event) => {
    setPasswordEntered(event.target.value)
  }

  // Attempt to load wallet. If fail display error.
  const onContinueClick = (event) => {
    try { walletLoad(selectedWallet, passwordEntered) }
      catch (e) {
        event.preventDefault();
        dispatch(setError({msg: e.message}))
      }
      props.setWalletLoaded(true);
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

          <select value={selectedWallet} onChange={onSelectedWalletChange}>
            {populateWalletNameOptions()}
          </select>

          <div className="inputs-item">
            <input id="Passphrase" type="password" name="password" required
              placeholder="Passphrase "
              value={passwordEntered}
              onChange={onPasswordChange}
                    />
          </div>
          <Link to="/home" onClick={onContinueClick}>
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
