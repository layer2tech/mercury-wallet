import scan from "../../images/scan-deposite.png";
import icon1 from "../../images/icon1.png";
import icon2 from "../../images/icon2.png";
import arrow from "../../images/scan-arrow.png";

import React from 'react';
import { useDispatch, useSelector } from 'react-redux'

import { callDepositInit, callDepositConfirm, setError, callDepositInitThunk } from '../../features/WalletDataSlice'
import { fromSatoshi } from '../../wallet/util'

import '../../containers/Deposit/Deposit.css';
import '../index.css';

const TransactionsBTC = (props) => {
  const deposits_initialised = useSelector(state => state.walletData).deposits_initialised;
  const dispatch = useDispatch();

  // run depositInit for selected deposit amount if not already complete
  props.selectedValues.forEach((item, id) => {
    if (!item.initialised && item.value !== null) {
      let deposit_res = dispatch(callDepositInitThunk(123))
      console.log("deposit_res: ", deposit_res)
      props.setValueSelectionInitialised(id)
    }

  })

  const despositConfirm = () => {
    let funding_txid = "f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce";
    deposits_initialised.forEach(deposit_promise => {
      deposit_promise.then((deposit) => {
        dispatch(callDepositConfirm({funding_txid: funding_txid, statecoin: deposit[1]}))
      })
      .catch((err => {
        dispatch(setError({msg: err.toString()}))
      }))
    })
  }


  const populateWithTransactionDisplayPanels = props.selectedValues.map((item, index) => {
    if (item.value != null) {
      return (
        <div key={index}>
          <div>
            <TransactionDisplay amount={item.value} confirmations={0} address={"tb1qxak9urlhzrvp3842c0m7f7ql67qaw8d2t7ntnt"}/>
          </div>
      </div>
      )
    }
  })

  return (
    <div className=" deposit">
      {populateWithTransactionDisplayPanels}
      <div className="Body">
          <button type="button" className="std-button" onClick={despositConfirm}>
              PERFORM TRANSFER RECEIVER
          </button>
      </div>
    </div>
  )
}

const TransactionDisplay = (props) => {

    return (
      <div className="Body">
          <div className="deposit-scan">
              <img src={scan} alt="image"/>
              <div className="deposit-scan-content">
                  <div className="deposit-scan-subtxt">
                      <span>Finish Creating the Statecoin by sending exactly {fromSatoshi(props.amount)} BTC to:</span>
                      <span>{props.confirmations} Confirmations</span>
                  </div>
                  <div className="deposit-scan-main">
                      <div className="deposit-scan-main-item">
                          <img src={icon1} alt="icon"/>
                          <span><b>{fromSatoshi(props.amount)}</b> BTC</span>
                      </div>
                      <img src={arrow} alt="arrow"/>
                      <div className="deposit-scan-main-item">
                          <img src={icon2} alt="icon"/>
                          <span className="long"><b>{props.address}</b></span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    )
}

export default TransactionsBTC;
