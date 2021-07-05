import plus from "../../images/plus-deposit.png";
import points from "../../images/points.png";

import React, {useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'
import {Button, Modal} from "react-bootstrap";

import {CreateStatecoin, TransactionsBTC, StdButton, Steppers, Tutorial} from "../../components";
import {isWalletLoaded, setError, callGetConfig} from '../../features/WalletDataSlice'

import './Deposit.css';

// sort_by 0=liquidity, 1=amount.
const DEFAULT_SETTINGS = {
  sort_by: "Liquidity",
  min_value: 0.000001,
  picks: 8
}

const STEPS = [
  {
    id: 1,
    description: 'Choose Amount and Value',
  },
  {
    id: 2,
    description: 'Complete BTC Transactions',
  },
];

const DepositPage = () => {
  const dispatch = useDispatch();

  // Show settings
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1)
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [selectedValues, setSelectedValues] = useState([{value: null, initialised: false, p_addr: "Initialising.."}]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [smallestOption, setSmallestOption] = useState(DEFAULT_SETTINGS.min_value);
  const setPicksSetting = (event) => {
    setSettings({
      ...settings,
      picks: event.target.value
    })
  }
  const setSortbySetting = (event) => setSettings({
    ...settings,
    sort_by: event.target.value
  })

  const handleChangeSmallest = (e) => {
    const value = e.target.value;
    setSmallestOption(value);
    if(value !== 'other') {
      setSettings({
        ...settings,
        min_value: value
      });
    }
  };

  const handleCustomSmallest = (e) => setSettings({
    ...settings,
    min_value: e.target.value
  })

  // Check if wallet is loaded. Avoids crash when Electron real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  // Value in some SelectionPanel that has been chosen
  const addValueSelection = (id, value) => {
    let current_values = selectedValues;
    current_values[id] = {value: value, initialised: false};
    setSelectedValues(current_values);
  }

  // Store value chosen and whether statecoin has been initialised yet
  const setValueSelectionInitialised = (id, value) => {
    let current_values = selectedValues;
    selectedValues[id].initialised = value;
    setSelectedValues(current_values);
  }

  // Set value chosen address. Called after depositInit has returned p_addr
  const setValueSelectionAddr = (id, p_addr) => {
    let current_values = selectedValues;
    selectedValues[id].p_addr = p_addr;
    setSelectedValues(current_values);
  }

  // Add SelectionPanel to form
  const addSelectionPanel = (id, value) => {
    let current_values = selectedValues;
    current_values.push({value: null, initialised: false});
    // current_values.push({value: DEFUALT_VALUE_SELECTION, initialised: false});
    setSelectedValues(current_values);
  }

  let current_config;
  try {
     current_config = callGetConfig();
  } catch(error) {
     console.warn('Can not get config', error)
  } 

  return (
    <div className={`${current_config.tutorials ? 'container-with-tutorials' : ''}`}>
      <div className="container deposit">
          <div className="Body ">
             <div className="deposit-header">
                 <h2 className="WalletAmount">
                     <img src={plus} alt="plus"/>
                     Deposit BTC
                 </h2>
                 <div className="nav-item">
                     <Link className="nav-link" to="/home">
                         <StdButton
                             label="Back"
                             className="Body-button transparent"/>
                     </Link>
                     <img onClick={handleShow} src={points} alt="points"/>

                 </div>
             </div>
              <h3 className="subtitle">Deposit BTC to create new Statecoins</h3>
          </div>
          <div className="wizard">
              <Steppers steps={STEPS} total={2} current={step} />
              {step === 1 ? (
                <CreateStatecoin
                  selectedValues={selectedValues}
                  addValueSelection={addValueSelection}
                  addSelectionPanel={addSelectionPanel}
                  settings={settings}
                />
              ) : (
                <TransactionsBTC
                  selectedValues={selectedValues}
                  setValueSelectionInitialised={setValueSelectionInitialised}
                  setValueSelectionAddr={setValueSelectionAddr}
                />
              )}
              {step === 1 ? (
                <button className="primary-btn blue" onClick={() => setStep(2)}>Continue</button>
              ) : (
                <button className="primary-btn blue" onClick={() => setStep(1)}>Go Back</button>
              )}
          </div>

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
                  <Button className="primary-btn ghost" onClick={handleClose}>
                      Close
                  </Button>

              </Modal.Footer>
          </Modal>
      </div>
      {current_config.tutorials && <Tutorial />}
    </div>
  )
}

export default withRouter(DepositPage);
