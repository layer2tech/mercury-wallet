import React, {useState} from 'react';
import {Link} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {setError, walletFromMnemonic, callGetConfig} from '../../features/WalletDataSlice'

import './confirmSeed.css'

let rands = [];
if (!require("../../settings.json").testing_mode) {
  rands = [Math.floor(Math.random()*11),Math.floor(Math.random()*11),Math.floor(Math.random()*11)]
}

const ConfirmSeed = (props) => {
  const dispatch = useDispatch();

  let words = props.wizardState.mnemonic.split(" ");
  const [missingwords, setMissingWords] = useState(rands.map((rand) => ({pos:rand, word:""})));

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
    // Create wallet and load into Redux state
    try { walletFromMnemonic(props.wizardState.wallet_name, props.wizardState.wallet_password, props.wizardState.mnemonic) }
      catch (e) {
        event.preventDefault();
        dispatch(setError({msg: e.message}))
      }
    props.setWalletLoaded(true);
  }

  return (
      <div className="wizard-form-confirm">
          <p>Click below or type in the missing words to confirm your seed key.</p>

          <form>
              {inputs}
          </form>
          <Link to="/home" onClick={onConfirmClick} className="confirm">
              Confirm
          </Link>
      </div>
  )
}

export default ConfirmSeed;
