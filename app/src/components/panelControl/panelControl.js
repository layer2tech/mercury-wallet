import React from 'react';
import StdButton from '../buttons/standardButton';

import './panelControl.css';
import '../index.css';

const createButtonAction = () => {
  // import('client-wasm').then(module => {
  //   module.call_curv_fn()
  //   // console.log("Rust string: ", module.greet_wo_alert());
  // })
  console.log("Create button pressed.");
}

const swapButtonAction = () => {
  // import('client-wasm').then(module => {
  //   module.call_curv_fn()
  //   // console.log("Rust string: ", module.greet_wo_alert());
  // })
  console.log("Swap button pressed.");
}

const withdrawButtonAction = () => {
  // import('client-wasm').then(module => {
  //   module.call_curv_fn()
  //   // console.log("Rust string: ", module.greet_wo_alert());
  // })
  console.log("Withdraw button pressed.");
}

const sendButtonAction = () => {
  // import('client-wasm').then(module => {
  //   module.call_curv_fn()
  //   // console.log("Rust string: ", module.greet_wo_alert());
  // })
  console.log("Send button pressed.");
}

const receiveButtonAction = () => {
  // import('client-wasm').then(module => {
  //   module.call_curv_fn()
  //   // console.log("Rust string: ", module.greet_wo_alert());
  // })
  console.log("Receive button pressed.");
}


const PanelControl = () => {
  return (
    <div className="Body">
      <h2 className="WalletAmount">0 Statecoins</h2>
      <div className="ButtonsPanel">
        <div className="ActionGroupLeft">
          <StdButton
            label="Create"
            onClick={createButtonAction}
            className="Body-button"/>
          <StdButton
            label="Swap"
            onClick={swapButtonAction}
            className="Body-button"/>
          <StdButton
            label="Withdraw"
            onClick={withdrawButtonAction}
            className="Body-button"/>
        </div>
        <div className="ActionGroupRight">
          <StdButton
            label="Send"
            onClick={sendButtonAction}
            className="Body-button"/>
          <StdButton
            label="Receive"
            onClick={receiveButtonAction}
            className="Body-button"/>
        </div>
      </div>
    </div>
  );
}

export default PanelControl;
