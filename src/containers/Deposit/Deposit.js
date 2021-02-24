import plus from "../../images/plus-deposit.png";
import points from "../../images/points.png";

import React, {useState} from 'react';
import {Link, withRouter} from "react-router-dom";
import MultiStep from "react-multistep";
import {Button, Modal} from "react-bootstrap";

import { CreateStatecoin, TransactionsBTC, StdButton} from "../../components";

import './Deposit.css';

const DEFUALT_VALUE_SELECTION = 1000;

const DepositPage = () => {
    // Show settings
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [selectedValues, setSelectedValues] = useState([{value: DEFUALT_VALUE_SELECTION, initialised: false, p_addr: "Initialising.."}]);

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
      current_values.push({value: DEFUALT_VALUE_SELECTION, initialised: false});
      setSelectedValues(current_values);
    }

    const steps = [
      { component: <CreateStatecoin
          selectedValues={selectedValues}
          addValueSelection={addValueSelection}
          addSelectionPanel={addSelectionPanel}
      /> },
      { component: <TransactionsBTC
        selectedValues={selectedValues}
        setValueSelectionInitialised={setValueSelectionInitialised}
        setValueSelectionAddr={setValueSelectionAddr}
      /> }
    ];

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
                <MultiStep steps={steps} />
            </div>

            <Modal show={show} onHide={handleClose} className="modal">
                <Modal.Header>
                    <h6>Display Settings</h6>
                </Modal.Header>
                <Modal.Body>
                    <div className="selected-item">
                        <span>Sort By</span>
                        <select>
                            <option value="HighestLiquidity">Highest Liquidity</option>
                            <option value="HighestLiquidity1">Highest Liquidity1</option>
                        </select>
                    </div>
                    <div className="selected-item">
                        <span>Smallest Value</span>
                        <select>
                            <option value="0.0005">0.0005 BTC</option>
                            <option value="0.0001">0.0001 BTC</option>
                        </select>
                    </div>
                    <div className="selected-item">
                        <span>Number of Picks</span>
                        <select>
                            <option value="6">6 options</option>
                            <option value="2">2 options</option>
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
