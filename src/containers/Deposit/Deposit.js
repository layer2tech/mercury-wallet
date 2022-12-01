"use strict";
import plus from "../../images/plus-deposit.png";
import points from "../../images/points.png";
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux'
import { Link, withRouter, Redirect } from "react-router-dom";
import { Button, Modal } from "react-bootstrap";
import {
  CreateStatecoin,
  TransactionsBTC,
  StdButton,
  Steppers,
  Tutorial
} from "../../components";

import {
  isWalletLoaded,
  callGetConfig,
  callGetAccount,
  callTokenInit, 
  setError, 
  callTokenVerify, 
  setTokenVerifyIdle, 
  resetToken, 
  callGetTokens
} from "../../features/WalletDataSlice";

import "./Deposit.css";

import { DUST_LIMIT } from "../../wallet/util";
import PayOnDeposit from "../../components/PayOnDeposit/PayOnDeposit";

// sort_by 0=liquidity, 1=amount.
const DEFAULT_SETTINGS = {
  sort_by: "Liquidity",
  min_value: 0.001,
  picks: 8,
};

const STEPS_POD = [
  {
    id: 1,
    description: 'Choose Amount and Value',
  },
  {
    id:2,
    description: 'Deposit Token'
  },
  {
    id: 3,
    description: 'Complete BTC Transactions',
  },
];

const STEPS = [
  {
    id: 1,
    description: "Choose Amount and Value",
  },
  {
    id: 2,
    description: "Complete BTC Transactions",
  },
];

const DepositPage = () => {

  const dispatch = useDispatch();

  const { fee_info, token_init_status, token, token_verify } = useSelector(state => state.walletData);
  // Show settings
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1)

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [selectedValues, setSelectedValues] = useState([
    { value: null, initialised: false, p_addr: "Initialising.." },
  ]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [smallestOption, setSmallestOption] = useState(
    DEFAULT_SETTINGS.min_value
  );

  const [childError, setChildError] = useState(false);
  
  // const [disableContinue, setDisableContinue] = useState(false);

  useEffect(() => {
    
    if(token_init_status === 'fulfilled'){
      // If new token amount set then push to next 
      setStep( 2 )
      // On continue add 1 step
    } 
    
    if(token_init_status === "rejected"){
      dispatch(setError({msg: "Token Initialise Unsuccessful! Please try again."}))
      return
    }

  },[token_init_status, dispatch])
  useEffect(() => {

    if(token.token.id !== "" && step === 2 ){

      dispatch(callTokenVerify({token_id: token.id}))
    }

  },[token, dispatch])


  useEffect(() => {
    
    if( token_verify.status === "fulfilled" ){
      
      dispatch(setTokenVerifyIdle())
      if(token_verify.spent){
        dispatch(resetToken());
        dispatch(setError({ msg: "Token spent: generate a new token for deposit" }));
        return
      }


      if(token_verify.confirmed !== true){
        dispatch(resetToken());
        dispatch(setError({msg: "Token payment not yet received"}))
        return
      } else{
        setSelectedValues([{ value: null, initialised: false, p_addr: "Initialising.." }])
        let id = 0
        // initialise selected values
        token.values.map(value => {
          addValueSelection(id, value)
          id += 1
          // set selected values according to token
        })
        setStep( 3 )
        return
      }
      

    } if( token_verify.status === "rejected" ){
      dispatch(setTokenVerifyIdle())
      dispatch(resetToken());
      dispatch(setError({msg: "Failed to verify token - check internet connection"}))
      return
    }

  },[token_verify, selectedValues, dispatch])


  const setPicksSetting = (event) => {
    setSettings({
      ...settings,
      picks: event.target.value,
    });
  };
  const setSortbySetting = (event) =>
    setSettings({
      ...settings,
      sort_by: event.target.value,
    });

  const handleChangeSmallest = (e) => {
    const value = e.target.value;
    setSmallestOption(value);
    if (value !== "other") {
      setSettings({
        ...settings,
        min_value: value,
      });
    }
  };

  const handleCustomSmallest = (e) =>
    setSettings({
      ...settings,
      min_value: e.target.value,
    });

  // Check if wallet is loaded. Avoids crash when Electron real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const onContinueClick = (e) => {
    if(e.target.innerHTML === "Continue"){
      
      if(step === 1){

        var tokenValue = calculateTokenFee(selectedValues);


        if(tokenValue <= DUST_LIMIT && tokenValue === 0 ){
          // no coin selected -> see token list
          setStep(2)
          return
        }
        
        
        if(tokenValue !== 0){

          let valuesArray = selectedValues.map(item => item.value)
          let newTokenRequired = true;
          callGetTokens().map(token => {
            
            if(JSON.stringify(valuesArray.sort()) == JSON.stringify(token.values.sort())){
              // check if arrays equivalent
              // No need to create a new token
              newTokenRequired = false
              setStep(2)
            }
          })
          if(newTokenRequired){
            // List of statecoin values for token
            dispatch(callTokenInit({amount: tokenValue,  values: valuesArray}));

            setSelectedValues([{ value: null, initialised: false, p_addr: "Initialising.." }]);
            // Reset selected values so coin not recreated without clicking

          }
        }

      }

      if( step === 2 ){
        // could add an automatic check at 5s that pushes to next step if confirmed

        // Throw error - token payment not yet received
        dispatch(callTokenVerify({token_id: token}))
        // verifying if token payment made

        // Test how long it takes payment to be received
      }

    }

    if(e.target.innerHTML === "Go Back") {
      setStep(step-1)
      // On Go Back: go back one step

    }
  }

  const calculateTokenFee = (coins) => {

    var initialValue = 0;
        
    var sumWithInitalValue = coins.reduce((prev,curr) => {
        return prev + curr.value
    }, initialValue);


    return sumWithInitalValue * (fee_info.deposit/(10000));
}

  // Value in some SelectionPanel that has been chosen
  const addValueSelection = (id, value) => {
    let current_values = selectedValues;
    current_values[id] = { value: value, initialised: false };
    setSelectedValues(current_values);
  };

  // Store value chosen and whether statecoin has been initialised yet
  const setValueSelectionInitialised = (id, value) => {
    let current_values = selectedValues;
    selectedValues[id].initialised = value;
    setSelectedValues(current_values);
  };

  // Set value chosen address. Called after depositInit has returned p_addr
  const setValueSelectionAddr = (id, p_addr) => {
    let current_values = selectedValues;
    selectedValues[id].p_addr = p_addr;
    setSelectedValues(current_values);
  };

  // Add SelectionPanel to form
  const addSelectionPanel = (id, value) => {
    let current_values = selectedValues;
    current_values.push({ value: null, initialised: false });
    // current_values.push({value: DEFUALT_VALUE_SELECTION, initialised: false});
    setSelectedValues(current_values);
  };

  const handleChildErrors = (retChildError) => {
    setChildError(retChildError);
  };


  let current_config;
  try {
    current_config = callGetConfig();
  } catch (error) {
    console.warn("Can not get config", error);
  }

  console.log('Fee Info: ',fee_info)

  return (
    <div
      className={`${
        current_config.tutorials ? "container-with-tutorials" : ""
      }`}
    >
      <div className="container deposit">
        <div className="Body ">
          <div className="deposit-header">
            <h2 className="main-header">
              <img src={plus} alt="plus" />
              Deposit BTC
            </h2>
            <div className="nav-item">
              <Link className="nav-link" to="/home">
                <StdButton label="Back" className="Body-button transparent" />
              </Link>
              <img onClick={handleShow} src={points} alt="points" />
            </div>
          </div>
          { fee_info.deposit > 0 ? (

        <h3 className="subtitle"> Create new statecoins. Deposit Fee: 
          <b> {fee_info.deposit / 100}%</b>
        </h3>):(
          <h3 className="subtitle"> Create new statecoins. Withdrawal Fee: 
            <b> {fee_info.withdraw / 100}%</b>
          </h3>
        )}

</div>
{fee_info.withdraw <= 0 ? (
<div className="wizard">
  {/* Pay on Deposit */}
    <Steppers steps={STEPS_POD} total={3} current={step} />
    {step === 1 ? (
      <CreateStatecoin
        selectedValues={selectedValues}
        addValueSelection={addValueSelection}
        addSelectionPanel={addSelectionPanel}
        settings={settings}
        handleChildErrors={handleChildErrors}
      />
      ):(null)}
    { step === 2 ? (
      < PayOnDeposit />
    ):(null)}
    {step === 3? (
      <TransactionsBTC
        selectedValues={selectedValues}
        setValueSelectionInitialised={setValueSelectionInitialised}
        setValueSelectionAddr={setValueSelectionAddr}
      />):(null)}
    {step === 1 ? (
      !childError && <button className={`primary-btn blue ${"step-" + step}`} onClick={(e) => onContinueClick(e)}>Continue</button>
    ) : (
      <div className="stepper-buttons">
        <button className={`primary-btn blue ${"step-" + step}`} onClick={(e) => onContinueClick(e)}>Go Back</button>
        {/* <button className={`primary-btn blue ${"step-" + step} continue`} onClick={(e) => onContinueClick(e)}>Continue</button> */}
      </div>
    )}

</div>
  ):(
    <div className = "wizard">
      {/* Pay on Withdrawal */}
      <Steppers steps={STEPS} total={2} current={step} />
      {step === 1 ? (
        <CreateStatecoin
          selectedValues={selectedValues}
          addValueSelection={addValueSelection}
          addSelectionPanel={addSelectionPanel}
          settings={settings}
          handleChildErrors={handleChildErrors}
        />
      ) : (
        <TransactionsBTC
          selectedValues={selectedValues}
          setValueSelectionInitialised={setValueSelectionInitialised}
          setValueSelectionAddr={setValueSelectionAddr}/>
      )}
      {step === 1 ? (
        !childError && <button className="primary-btn blue" onClick={() => setStep(2)}>Continue</button>
      ) : (
        <button className="primary-btn blue" onClick={() => setStep(1)}>Go Back</button>
      )}
    </div>
  )}

<Modal show={show} onHide={handleClose} className="modal deposit-settings">
<Modal.Header>
  <h6>Display Settings</h6>
</Modal.Header>
<Modal.Body>
  <div className="selected-item">
    <span>Sort By</span>
    <select
      onChange={setSortbySetting}
      value={settings.sort_by}
    >
      <option value="Liquidity">Highest Liquidity</option>
      <option value="LowToHigh">Value Low to High</option>
      <option value="HighToLow">Value High to Low</option>
    </select>
  </div>
  <div className="selected-item">
    <span>Smallest Value</span>
    <select value={smallestOption} onChange={handleChangeSmallest}>
      <option value="0.000001">0.000001 BTC</option>
      <option value="0.00001">0.00001 BTC</option>
      <option value="0.0001">0.0001 BTC</option>
      <option value="0.001">0.001 BTC</option>
      <option value="0.01">0.01 BTC</option>
      <option value="other">Other</option>
    </select>
    {smallestOption === 'other' && (
      <input
        className="custom-smallest"
        type="text"
        value={settings.min_value}
        onChange={handleCustomSmallest} />
    )}
  </div>
  <div className="selected-item">
    <span>Number of Picks</span>
    <select value={settings.picks} onChange={setPicksSetting}>
      <option value="4">4 options</option>
      <option value="8">8 options</option>
      <option value="12">12 options</option>
    </select>
  </div>
</Modal.Body>
<Modal.Footer>
  <Button className="action-btn-normal" onClick={handleClose}>
    Close
  </Button>
</Modal.Footer>
</Modal>
</div>
{current_config.tutorials && <Tutorial />}
</div>
  );
};

export default withRouter(DepositPage);