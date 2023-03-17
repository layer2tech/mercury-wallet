'use strict';
import React, { useEffect, useState } from 'react';
import {withRouter} from "react-router-dom";
import {useDispatch} from 'react-redux'
import {CreateWizardForm, ConfirmSeed, DisplaySeed, Steppers} from "../../components";
import {setError} from '../../features/WalletDataSlice'
import {Storage} from '../../store';

import './CreateWalletWizard.css'

let bip39 = require('bip39');

const CreateWizardStep = {
  FORM: 1,
  DISPLAYSEED: 2,
  CONFIRMSEED: 3
}

const STEPS = [
  {
    id: 1,
    description: 'Create Password',
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
  let mnemonic = bip39.generateMnemonic();
  const dispatch = useDispatch();
  const [walletNames,setWalletNames] = useState()
  const [confirmDetails,setConfirmDetails] = useState(false)
  const [startSeed,setStartSeed] = useState(false)

  
  const [step, setStep] = useState(CreateWizardStep.FORM)
  const [wizardState, setWizardState] = useState(
    {
      wallet_name: "",
      wallet_password: "",
      wallet_network: "",
      mnemonic: mnemonic,
    });
    
  useEffect(()=>{

    let store
    if(confirmDetails === true) {
      store = new Storage(`wallets/${wizardState.wallet_name}/config`);
      //Store wallet in own directory

      let wallet_names = store.getWalletNames();
      //Check for if wallet name already exists, check in above directory
    
      setWalletNames(wallet_names)
    
      setStartSeed(true)
      //When submit button pressed check applied by changing state of startSeed
      setConfirmDetails(false)
      //Reset submit button
    }

  },[confirmDetails, wizardState.wallet_name])

  useEffect(()=>{
    if(startSeed === true){
      let inputName = wizardState.wallet_name
      //init wallet name check

      if (walletNames.filter(wallet => wallet.name === inputName).length === 0) {
      // Check for file with this wallet name
        //if no file: move to next step
        setStep(CreateWizardStep.DISPLAYSEED);
        setStartSeed(false);
        //Reset check
        return
      }
      dispatch(setError({msg: "Wallet with name "+wizardState.wallet_name+" already exists."}));
      setStartSeed(false);
      //Reset check
    }
  },[startSeed, dispatch, walletNames, wizardState.wallet_name])
    
  const setStateWalletName = (event) => setWizardState({...wizardState, wallet_name: event.target.value});
  const setStateWalletPassword = (event) => setWizardState({...wizardState, wallet_password: event.target.value});
  const setStateWalletNetwork = (networkType) => setWizardState({...wizardState, wallet_network: networkType});

  const handleSubmit = () => {
    setConfirmDetails(true)
    //Initialise check to see if wallet name already exists
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
            setStateWalletNetwork={setStateWalletNetwork}
            submitTitle="Create"
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
    </div>
  )
}

export default withRouter(CreateWizardPage);