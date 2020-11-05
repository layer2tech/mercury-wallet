import React from 'react';
import StdButton from '../buttons/standardButton';

import './panelControl.css';
import '../index.css';

const createButtonAction = () => {
  import('client-wasm').then(module => {
    module.deposit()
  })
}

const swapButtonAction = () => {
  import('client-wasm').then(module => {
    module.swap()
  })
}

const withdrawButtonAction = () => {
  import('client-wasm').then(module => {
    module.withdraw()
  })
}

const sendButtonAction = () => {
  import('client-wasm').then(module => {
    module.transfer_sender()
  })
}

const receiveButtonAction = () => {
  import('client-wasm').then(module => {
    module.gen_se_addr()
  })
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
