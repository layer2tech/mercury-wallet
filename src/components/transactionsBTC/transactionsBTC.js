import scan from "../../images/scan-deposite.png";
import icon1 from "../../images/icon1.png";
import icon2 from "../../images/icon2.png";
import arrow from "../../images/scan-arrow.png";

import React, {useState} from 'react';
import { useDispatch } from 'react-redux'

import { callDepositInit, callDepositConfirm,
  callGetUnconfirmedStatecoins  } from '../../features/WalletDataSlice'
import { fromSatoshi } from '../../wallet/util'

import '../../containers/Deposit/Deposit.css';
import '../index.css';

const TransactionsBTC = (props) => {
  const [state, setState] = useState({});

  const dispatch = useDispatch();

  // First of all run depositInit for selected deposit amount if not already complete
  props.selectedValues.forEach((item, id) => {
    if (!item.initialised && item.value !== null) {
      dispatch(callDepositInit(item.value))
      .then((res => {  // when finished update p_addr in GUI
        if (res.error===undefined) {
          props.setValueSelectionAddr(id, res.payload[1])
          setState({}) //update state to refresh TransactionDisplay render
        }
      }))
      props.setValueSelectionInitialised(id, true)
    }
  })


  // Fetch all outstanding initialised deposit_inits from wallet
  let deposit_inits = callGetUnconfirmedStatecoins();


  const scriptHashSubscribeCallBackFn = async () => {
    // verify Tx is correct

    // get number of confs

    // Update confs display
    // setConfsForAddr(item.p_addr, 100)

    // update confs with async loop polling getTxHex

  }


  // Force confirm all outstanding depositInit's.
  // Get all unconfirmed coins and call depositConfirm with dummy txid value.
  const despositConfirm = () => {
    let funding_txid = "f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce";
    callGetUnconfirmedStatecoins().forEach((statecoin => {
      dispatch(callDepositConfirm({shared_key_id: statecoin.shared_key_id, funding_txid: funding_txid}))
    }));
  }

  const populateWithTransactionDisplayPanels = deposit_inits.map((item, index) => {
    if (item.value != null) {
      return (
        <div key={index}>
          <div>
            <TransactionDisplay amount={item.value} confirmations={item.confirmations} address={item.p_addr}/>
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

  const copyAddressToClipboard = () => {
    navigator.clipboard.writeText(props.address);
  }

  return (
    <div className="Body">
        <div className="deposit-scan">
            <img src={scan} alt=""/>
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
                        <img type="button" src={icon2} alt="icon" onClick={copyAddressToClipboard}/>
                        <span className="long"><b>{props.address}</b></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default TransactionsBTC;
