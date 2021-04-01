import React, {useState} from 'react';
import {Link} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {Storage} from '../../store';
import {walletLoad, setError, callGetVersion, callGetUnspentStatecoins} from '../../features/WalletDataSlice'

import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg";
import  './LoadWallet.css'

let store = new Storage();


const LoadWalletPage = (props) => {
  const [showPass, setShowPass] = useState(false);
  const dispatch = useDispatch();

  let wallet_name_password_map = store.getWalletNamePasswordMap()

  const [selectedWallet, setSelected] = useState(wallet_name_password_map.length ? wallet_name_password_map[0].name : "")
  const toggleShowPass = () => setShowPass(!showPass);
  const onSelectedWalletChange = (event) => {
    setSelected(event.target.value)
  }
  const [passwordEntered, setPasswordEntered] = useState("")
  const onPasswordChange = (event) => {
    setPasswordEntered(event.target.value)
  }

  // Quick check for expiring or potentially dangerous coins.
  // If so display error dialogue
  const checkForCoinsHealth = () => {
    let unspent_coins_data = callGetUnspentStatecoins();
    let coins_data = unspent_coins_data[0];
    for (let i=0; i<coins_data.length; i++) {
      if (coins_data[i].wallet_version !== callGetVersion()) {
        dispatch(setError({msg: "Warning: Coin in wallet was created in previous wallet version. Due to rapid development some backward incompatible changes may break old coins. We recommend withdrawing testnet coins and creating a fresh wallet."}))
        break;
      };
      if (coins_data[i].expiry_data.months <= 1) {
        dispatch(setError({msg: "Warning: Coin in wallet is close to expiring."}))
        break;
      };
    }
  }

  // Attempt to load wallet. If fail display error.
  const onContinueClick = (event) => {
    try { walletLoad(selectedWallet, passwordEntered) }
      catch (e) {
        event.preventDefault();
        dispatch(setError({msg: e.message}))
      }
      checkForCoinsHealth();
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
            <input 
              id="Passphrase" 
              type={showPass ? 'text' : 'password'} name="password"
              name="password" 
              required
              placeholder="Passphrase "
              value={passwordEntered}
              onChange={onPasswordChange}
            />
            <span className={'eye-icon'} onClick={toggleShowPass}>
                {showPass ? <img src={eyeIconOff} /> : <img src={eyeIcon} />}
            </span>
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
