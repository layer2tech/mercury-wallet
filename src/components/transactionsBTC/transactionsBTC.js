import scan from "../../images/scan-deposite.png";
import icon1 from "../../images/icon1.png";
import icon2 from "../../images/icon2.png";
import arrow from "../../images/scan-arrow.png";

import React from 'react';

import '../../containers/Deposit/Deposit.css';

const TransactionsBTC = (props) => {

  const despositInit = () => {
    
  }

  const populateWithTransactionDisplayPanels = props.selectedValues.map((item, index) => {
    if (item != null) {
      return (
        <div key={index}>
          <div>
            <TransactionDisplay amount={item} confirmations={0} address={"fdjle"}/>
          </div>
        </div>
      )
    }
  })

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
                      <span>Finish Creating the Statecoin by sending exactly {props.amount} BTC to:</span>
                      <span>{props.confirmations} Confirmations</span>
                  </div>
                  <div className="deposit-scan-main">
                      <div className="deposit-scan-main-item">
                          <img src={icon1} alt="icon"/>
                          <span><b>{props.amount}</b> BTC</span>
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
