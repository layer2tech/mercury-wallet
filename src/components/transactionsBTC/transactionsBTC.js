import scan from "../../images/scan-deposite.png";
import icon1 from "../../images/icon1.png";
import icon2 from "../../images/icon2.png";
import arrow from "../../images/scan-arrow.png";

import React, {useState} from 'react';
import { useDispatch, useSelector } from 'react-redux'

import '../../containers/Deposit/Deposit.css';
import { callDepositInit, callDepositConfirm } from '../../features/WalletDataSlice'
import { fromSatoshi } from '../../wallet/util'

const TransactionsBTC = (props) => {
  const deposits_initialised = useSelector(state => state.walletData).deposits_initialised;
  const state = useSelector(state => state.walletData);
  const dispatch = useDispatch();

  const [initiated, setInitiated] = useState(false); // store selected coins shared_key_id

  const despositInit = () => {
    console.log("deposits_initialised: ", deposits_initialised)
    props.selectedValues.forEach(value => {
      dispatch(callDepositInit({value: value}))
    })
    setInitiated(true)
    console.log("deposits_initialised: ", deposits_initialised)
  }

  const despositConfirm = () => {
    let funding_txid = "f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce";
    console.log("deposits_initialised: ", deposits_initialised)
    console.log("state: ", state)
    deposits_initialised.forEach(deposit_promise => {
      deposit_promise.then((deposit) => {
        console.log("deposit: ", deposit)
        dispatch(callDepositConfirm({funding_txid: funding_txid, statecoin: deposit[1]}))

      })
    })
    // setInitiated(true)
    // console.log("deposits_initialised: ", deposits_initialised)
  }

  const populateWithTransactionDisplayPanels = props.selectedValues.map((item, index) => {
    if (item != null) {
      return (
        <div key={index}>
          <div>
            <TransactionDisplay amount={item} confirmations={0} address={"fdjle"}/>
          </div>
          <div className="Body">
            <span className={"create-title"} onClick={despositConfirm}>
                FINALIZE DEPOSITS
            </span>
          </div>
        </div>
      )
    }
  })

  if (!initiated) {
    despositInit()
  }
  return (
    <div className=" deposit">

      {populateWithTransactionDisplayPanels}
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
