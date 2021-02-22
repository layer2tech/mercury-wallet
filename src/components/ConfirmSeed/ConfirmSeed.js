import React, {useState} from 'react';
import {Link} from "react-router-dom";
import { useDispatch } from 'react-redux'

import {Wallet} from "../../wallet";
import {setError } from '../../features/WalletDataSlice'

import './ConfirmSeed.css'


const ConfirmSeed = (props) => {
  const dispatch = useDispatch();

  let words = props.mnemonic.split(" ");

  const [missingwords, setMissingWords] = useState([{pos:props.rands[0], word:""},{pos:props.rands[1], word:""}, {pos:props.rands[2], word:""}]);
  const inputMissingWord = (event) => {
    let map = missingwords.map((item) => {if (item.pos==event.target.id) {item.word=event.target.value} return item})
    setMissingWords(map)
  }

  // Display other words and create input boxes
  let words_without_missing = words.map((item, index) => (props.rands.includes(index) ? "" : item))
  const inputs = words_without_missing.map((item, index) => (
      <input key={index}
        id={index}
        type="text"
        placeholder={index + 1 + ". " + item}
        value={item === '' ? missingwords.find((item) => {if (item.pos==index) {return item}}).word : ""}
        disabled={item === '' ? "" : "disabled"}
        onChange={inputMissingWord}/>
  ))

  // Confirm words are correct
  const onClickConf = (event) => {
    for (let i=0;i<missingwords.length; i++) {
      if (missingwords[i].word!=words[missingwords[i].pos]) {
        event.preventDefault();
        dispatch(setError({msg: "Seed confirmation failed."}))
      }
    }
  }

    return (
        <div className="wizard-form-confirm">
            <p>Click below or type in the missing words to confirm your seed key.</p>

            <form>
                {inputs}
            </form>
            <Link onClick={onClickConf} className="confirm">
                Test
            </Link>
            <Link to={"/home/mnemonic/"+props.mnemonic} onClick={onClickConf} className="confirm">
                Confirm
            </Link>
        </div>
    )
}

export default ConfirmSeed;
