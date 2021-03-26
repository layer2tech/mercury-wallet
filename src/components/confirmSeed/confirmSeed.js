import React, { useState } from 'react';
import { withRouter } from "react-router-dom";
import {useDispatch} from 'react-redux'
import {setError, walletFromMnemonic, callGetVersion, callGetUnspentStatecoins} from '../../features/WalletDataSlice'

import './confirmSeed.css'

const ConfirmSeed = (props) => {
  const dispatch = useDispatch();
  const [rands] = useState(() => !require("../../settings.json").testing_mode ?
    [
      Math.floor(Math.random()*11),
      Math.floor(Math.random()*11),
      Math.floor(Math.random()*11)
    ] : []
  )

  let words = props.wizardState.mnemonic.split(" ");
  const [missingwords, setMissingWords] = useState(() => rands.map((rand) => ({pos:rand, word:""})));

  const inputMissingWord = (event) => {
    let map = missingwords.map((item) => {if (item.pos===parseInt(event.target.id)) {item.word=event.target.value} return item})
    setMissingWords(map)
  }

  // Display other words and create input boxes
  let words_without_missing = words.map((item, index) => (rands.includes(index) ? "" : item))
  const inputs = words_without_missing.map((item, index) => (
      <input key={index}
        id={index}
        type="text"
        placeholder={index + 1 + ". " + item}
        value={item === '' ? missingwords.find((item) => {if (item.pos===index) {return item} return null}).word : ""}
        disabled={item === '' ? "" : "disabled"}
        onChange={inputMissingWord}/>
  ))

  // Confirm words are correct
  const onConfirmClick = (event) => {
    // Verify mnemonic confirmation
    for (let i=0;i<missingwords.length; i++) {
      if (missingwords[i].word!==words[missingwords[i].pos]) {
        event.preventDefault();
        dispatch(setError({msg: "Seed confirmation failed."}))
        return
      }
    }

    // Quick check for expiring coins.
    // If so display error dialogue
    const checkForCoinsHealth = () => {
      let unspent_coins_data = callGetUnspentStatecoins();
      let coins_data = unspent_coins_data[0];
      for (let i=0; i<coins_data.length; i++) {
        if (coins_data[i].wallet_version !== callGetVersion()) {
          dispatch(setError({msg: "Warning: Coin in wallet was created in previous wallet version. Due to rapid development some backward incompatible changes may break old coins. We recommend withdrawing testnet coins and creating a fresh wallet."}))
          break;
        };
      }
    }

    // Create wallet and load into Redux state
    try {
      walletFromMnemonic(props.wizardState.wallet_name, props.wizardState.wallet_password, props.wizardState.mnemonic)
      props.history.push('/home')
    } catch (e) {
      event.preventDefault();
      dispatch(setError({msg: e.message}))
    }
    checkForCoinsHealth();
    props.setWalletLoaded(true);
  }

  return (
      <div className="wizard-form-confirm">
          <p>Click below or type in the missing words to confirm your seed key.</p>

          <form>
              {inputs}
          </form>
          <div className="mt-3">
            <button onClick={props.onPrevStep} className="btn btn-primary">Prev</button>
            <button className="btn btn-primary" onClick={onConfirmClick} >
                Confirm
            </button>
          </div>
      </div>
  )
}

export default withRouter(ConfirmSeed);
