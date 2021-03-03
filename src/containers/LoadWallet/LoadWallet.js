import React, {useState} from 'react';
import { Link } from "react-router-dom";

import { Storage } from '../../store';

import  './LoadWallet.css'

let Store = window.require('electron-store');
let store = new Storage();

let wallet_names = store.getWalletNames()

const LoadWalletPage = () => {

  const [selected, setSelected] = useState(wallet_names[0])
  const onSelectedChange = (event) => {
    setSelected(event.target.value)
  }

  const populateWalletNameOptions = () => {
    return wallet_names.map((name) => (<option value={name}>{name}</option>))
  }

  return (
  <div className="memory-form">
    <form>


      {wallet_names.length ?
        <div>
          <p>Select a wallet to load and input its password </p>

          <select value={selected} onChange={onSelectedChange}>
            {populateWalletNameOptions()}
          </select>

          <div className="inputs-item">
              <input id="Passphrase" type="password" name="password" required placeholder="Passphrase "
                    />
          </div>
          <Link to={"/home/load/"+JSON.stringify({wallet_name: selected})} >
            Continue
          </Link>
        </div>
        :
        <p>No Wallet in memory. Please create a new one.</p>
      }

      <Link to="/" >
        Back
      </Link>
    </form>
  </div>
)
}

export default LoadWalletPage;
