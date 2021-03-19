import React, {useState, useMemo} from 'react';
import {Link, withRouter} from "react-router-dom";

import {CreateWizardForm, ConfirmSeed, DisplaySeed, Steppers} from "../../components";

import './CreateWalletWizard.css'

let bip39 = require('bip39');

const mnemonic = bip39.generateMnemonic();

const CreateWizardStep = {
  FORM: 1,
  DISPLAYSEED: 2,
  CONFIRMSEED: 3
}

// MultiStep wizard for wallet setup
const CreateWizardPage = (props) => {
  const [step, setStep] = useState(CreateWizardStep.FORM)

  const [wizardState, setWizardState] = useState(
    {
      wallet_name: "",
      wallet_password: "",
      mnemonic: mnemonic,
    });
  const setStateWalletName = (event) => setWizardState({...wizardState, wallet_name: event.target.value});
  const setStateWalletPassword = (event) => setWizardState({...wizardState, wallet_password: event.target.value});

  const Component = () => {
    switch(step) {
      case 1:
        return (
          <CreateWizardForm
            wizardState={wizardState}
            onSubmit={() => setStep(CreateWizardStep.DISPLAYSEED)}
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
      <Steppers total={3} current={step} />
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
