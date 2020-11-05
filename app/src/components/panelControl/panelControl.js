import React from 'react';
import { useDispatch } from 'react-redux'
import { nanoid } from '@reduxjs/toolkit'

import { addCoin, removeCoin } from '../../features/CoinDataSlice'

import StdButton from '../buttons/standardButton';

import './panelControl.css';
import '../index.css';

const swapButtonAction = () => {
  import('client-wasm').then(module => {
    module.swap()
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
  const dispatch = useDispatch()

  const createButtonAction = () => {
    import('client-wasm').then(module => {
      module.deposit()
    })
    dispatch(
      addCoin({
        id: nanoid(),
        amount: "0.01",
        time_left: "11",
        address: "bc5f...1lp4",
      })
    )
  }

  const withdrawButtonAction = () => {
    import('client-wasm').then(module => {
      module.withdraw()
    })
    dispatch(
      removeCoin()
    )
  }


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
