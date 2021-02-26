import React, {useRef} from 'react';
import {Link} from "react-router-dom";

import  './LoadWallet.css'

let Store = window.require('electron-store');
let store = new Store();

const LoadWalletPage = () => {

    const checkWalletStored = () => {
	if (store.get('wallet')) {
	    if (Object.keys(store.get('wallet')).length) {
		return true
	    }
	}
      return false
    }

    return (
    <div className="memory-form">
      <form>

        {/*
        <div className="inputs-item">
            <input id="Name" disabled={true} type="text" name="Wallet Name" placeholder="Wallet name"
                   required/>
        </div>
        <div className="inputs-item">
            <input id="Passphrase" type="password" name="password" required placeholder="Passphrase "
                  />
        </div>
        */}
        {checkWalletStored() ?
          <div>
          <p>Wallet found in memory. Press continue to Load. </p>
            <Link to="/home/load" >
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
