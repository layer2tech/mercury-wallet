import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";
import {useDispatch} from 'react-redux'

import {CreateWizardForm, ConfirmSeed, DisplaySeed, Steppers} from "../../components";
import {setError} from '../../features/WalletDataSlice'
import {Storage} from '../../store';

import './CreateWalletWizard.css'

let bip39 = require('bip39');
const mnemonic = bip39.generateMnemonic();
let store = new Storage();

const CreateWizardStep = {
  FORM: 1,
  DISPLAYSEED: 2,
  CONFIRMSEED: 3
}

const STEPS = [
  {
    id: 1,
    description: 'Create Passphrase',
  },
  {
    id: 2,
    description: 'New Wallet Seed',
  },
  {
    id: 3,
    description: 'Confirm Seed',
  },
];


// MultiStep wizard for wallet setup
const CreateWizardPage = (props) => {
  const dispatch = useDispatch();

  let wallet_names = store.getWalletNames();

  const [step, setStep] = useState(CreateWizardStep.FORM)
  const [wizardState, setWizardState] = useState(
    {
      wallet_name: "",
      wallet_password: "",
      mnemonic: mnemonic,
    });
  const setStateWalletName = (event) => setWizardState({...wizardState, wallet_name: event.target.value});
  const setStateWalletPassword = (event) => setWizardState({...wizardState, wallet_password: event.target.value});

  const handleSubmit = () => {
    if (wallet_names.indexOf(wizardState.wallet_name)<0) {
      setStep(CreateWizardStep.DISPLAYSEED);
      return
    }
    dispatch(setError({msg: "Wallet with name "+wizardState.wallet_name+" already exists."}))
  }

  const Component = () => {
    switch(step) {
      case 1:
        return (
          <CreateWizardForm
            wizardState={wizardState}
            onSubmit={() => handleSubmit()}
            setStateWalletName={setStateWalletName}
            setStateWalletPassword={setStateWalletPassword}
          />
        )
      case 2:
        return (
          <DisplaySeed
            onPrevStep={() => setStep(CreateWizardStep.FORM)}
            onNextStep={() => setStep(CreateWizardStep.CONFIRMSEED)}
            wizardState={wizardState}
          />
        )
      default:
        return (
          <ConfirmSeed
            setWalletLoaded={props.setWalletLoaded}
            onPrevStep={() => setStep(CreateWizardStep.DISPLAYSEED)}
            wizardState={wizardState}
          />
        )
    }
  }

  return (
    <div className="container wizard">
      <Steppers
        steps={STEPS}
        current={step}
      />
      {Component()}
      <div className="btns">
        <Link to="/" >
          go back
        </Link>
      </div>
    </div>
  )
}

export default withRouter(CreateWizardPage);
