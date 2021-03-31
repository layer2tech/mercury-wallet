import plus from "../../images/plus-deposit.png";
import points from "../../images/points.png";

import React, {useState} from 'react';
import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'
import {Button, Modal} from "react-bootstrap";

import {CreateStatecoin, TransactionsBTC, StdButton, Steppers} from "../../components";
import {isWalletLoaded, setError} from '../../features/WalletDataSlice'

import './Deposit.css';

// sort_by 0=liquidity, 1=amount.
const DEFAULT_SETTINGS = {sort_by: "Liquidity", min_value: 0.000001, picks: 8}

const DepositPage = () => {
  const dispatch = useDispatch();

  // Show settings
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1)
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [selectedValues, setSelectedValues] = useState([{value: null, initialised: false, p_addr: "Initialising.."}]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const setPicksSetting = (event) => setSettings({
    ...settings,
    picks: event.target.value
  })
  const setSortbySetting = (event) => setSettings({
    ...settings,
    sort_by: event.target.value
  })
  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    dispatch(setError({msg: "No Wallet loaded."}))
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

  return (
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
              <Steppers total={2} current={step} />
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
                <button className="btn btn-primary" onClick={() => setStep(2)}>Next</button>
              ) : (
                <button className="btn btn-primary" onClick={() => setStep(1)}>Prev</button>
              )}
          </div>

          <Modal show={show} onHide={handleClose} className="modal">
              <Modal.Header>
                  <h6>Display Settings</h6>
              </Modal.Header>
              <Modal.Body>
                  <div className="selected-item" onChange={setSortbySetting}>
                      <span>Sort By</span>
                      <select>
                          <option value="Liquidity">Liquidity</option>
                          <option value="Amount">Amount</option>
                      </select>
                  </div>
                  <div className="selected-item">
                      <span>Smallest Value</span>
                      <select>
                          <option value="0.0001">0.0001 BTC</option>
                      </select>
                  </div>
                  <div className="selected-item" onChange={setPicksSetting}>
                      <span>Number of Picks</span>
                      <select>
                          <option value="4">4 options</option>
                          <option value="8">8 options</option>
                          <option value="12">12 options</option>
                      </select>
                  </div>

              </Modal.Body>
              <Modal.Footer>
                  <Button variant="secondary" onClick={handleClose}>
                      Close
                  </Button>

              </Modal.Footer>
          </Modal>
      </div>
  )
}

export default withRouter(DepositPage);
