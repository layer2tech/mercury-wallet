import React from 'react';
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { nanoid } from '@reduxjs/toolkit'

import { addCoin, removeCoin } from '../../features/CoinDataSlice'
import { Swap, TransferSender, TransferReceiver, Deposit, Withdraw } from '../../wallet'

import StdButton from '../buttons/standardButton';

import './panelControl.css';
import '../index.css';

const PanelControl = () => {
  const dispatch = useDispatch()
  const totalAmount = useSelector(state => state.coinData.total_amount)

  const createButtonAction = () => {
    let amount = 0.1; // value should be provided via props
    let deposit_data = Deposit(amount);
    console.log(deposit_data);
    dispatch(
      addCoin({
        id: deposit_data.state_chain_id,
        amount: amount,
        time_left: deposit_data.time_left,
        funding_txid: deposit_data.funding_txid,
      })
    )
  }

  const withdrawButtonAction = () => {
    let state_chain_id = "57307393-d35c-438c-87dc-d06054277a5d";
    let withdraw_data = Withdraw(state_chain_id);
    console.log(withdraw_data);
    dispatch(
      removeCoin()
    )
  }

  const swapButtonAction = () => {
    let state_chain_id = "57307393-d35c-438c-87dc-d06054277a5d";
    let swap_size = 10;
    let anon_score = 0;
    let swap_data = Swap(state_chain_id, swap_size, anon_score);
    console.log(swap_data)
    dispatch( // rm old coin
      removeCoin()
    )
    dispatch( // replace with new
      addCoin({
        id: swap_data.state_chain_id,
        amount: swap_data.amount,
        time_left: swap_data.time_left,
        funding_txid: swap_data.funding_txid,
      })
    )
  }

  const sendButtonAction = () => {
    let state_chain_id = "57307393-d35c-438c-87dc-d06054277a5d";
    let receiver_addr = "026ff25fd651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0ebcrt1qq0znj64a5zukv7yew52zjzmdndch3r0vxu8668";
    let transfer_data = TransferSender(state_chain_id, receiver_addr);
    console.log(transfer_data);
    dispatch(
      removeCoin()
    )
  }

  const receiveButtonAction = () => {
    let receiver_msg = "receivermessage3fd1524b966044187430afb44a7edfee4";
    let transfer_data = TransferReceiver(receiver_msg);
    console.log(transfer_data)
    dispatch(
      addCoin({
        id: transfer_data.state_chain_id,
        amount: transfer_data.amount,
        time_left: transfer_data.time_left,
        funding_txid: transfer_data.funding_txid,
      })
    )
  }


  return (
    <div className="Body">
      <h2 className="WalletAmount">{totalAmount} Statecoins</h2>
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
