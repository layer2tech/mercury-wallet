import walletIcon from '../../images/walletIcon.png';
import orange from "../../images/wallet-orange.png";
import withdrowIcon from "../../images/withdrow-icon.png";

import {Link, withRouter, Redirect} from "react-router-dom";
import React, {useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {isWalletLoaded, callWithdraw, callGetFeeEstimation, setError, setNotification, callGetConfig} from '../../features/WalletDataSlice';
import {Coins, StdButton, AddressInput, Tutorial} from "../../components";
import {FILTER_BY_OPTION} from "../../components/panelControl/panelControl"
import {fromSatoshi, toSatoshi} from '../../wallet/util';

import './Withdraw.css';

export const DEFAULT_FEE = 0.00001;

const WithdrawPage = () => {
  const dispatch = useDispatch();
  const { balance_info, filterBy } = useSelector(state => state.walletData);

  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [inputAddr, setInputAddr] = useState("");
  const onInputAddrChange = (event) => {
    setInputAddr(event.target.value);
  };
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render
  const [txFeePerKB, setTxFeePerKB] = useState(DEFAULT_FEE); // chosen fee per kb value
  // Calc Med and High fee values and convert to satoshis
  const calcTxFeePerKbList = (low_fee_value) => {
    if (low_fee_value<0.0001) { // < 10 satoshis per byte
      return [low_fee_value, low_fee_value*2, low_fee_value*4]
    }
    return [low_fee_value, low_fee_value*1.1, low_fee_value*1.2]
  }
  const [txFeePerByteList, setTxFeePerByteList] = useState(calcTxFeePerKbList(DEFAULT_FEE)); // list of fee per kb options in satoshis

  function addSelectedCoin(statechain_id) {
    setSelectedCoins( prevSelectedCoins => {
      let newSelectedCoins = prevSelectedCoins;
      const isStatechainId = (element) => element == statechain_id;
      let index = newSelectedCoins.findIndex(isStatechainId);
      if (index != -1){
        newSelectedCoins.splice(index,1);
      } else {
        newSelectedCoins.push(statechain_id);
      }
      return newSelectedCoins;
    });
  }

  // Get Tx fee estimate
  useEffect(() => {
    dispatch(callGetFeeEstimation()).then(tx_fee_estimate => {
      if (tx_fee_estimate>0) {
        setTxFeePerKB(tx_fee_estimate);
      }
    })
  }, []);

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const withdrawButtonAction = async () => {
    // check statechain is chosen
    if (selectedCoins.length === 0) {
      dispatch(setError({msg: "Please choose a StateCoin to withdraw."}))
      return
    }
    if (!inputAddr) {
      dispatch(setError({msg: "Please enter an address to withdraw to."}))
      return
    }

    dispatch(callWithdraw({"shared_key_ids": selectedCoins, "rec_addr": inputAddr, "fee_per_kb": txFeePerKB})).then((res => {
      if (res.error===undefined) {
        setSelectedCoins([])
        setInputAddr("")
        setRefreshCoins((prevState) => !prevState);
        dispatch(setNotification({msg:"Withdraw to "+inputAddr+" Complete!"}))
      }
    }))
  }

  const filterByMsg = () => {
    let return_str = "Statecoin";
    if (balance_info.num_coins > 1) {
      return_str = return_str+"s"
    }
    switch (filterBy) {
      case FILTER_BY_OPTION[0].value:
        return return_str+ " available in Wallet";
      case FILTER_BY_OPTION[1].value:
        return return_str+ " already withdrawn";
      case FILTER_BY_OPTION[2].value:
        return return_str+ " in transfer process";
    }
  }

  const handleFeeSelection = (event) => setTxFeePerKB(event.target.value)

  let current_config;
  try {
    current_config = callGetConfig();
  } catch(error) {
    console.warn('Can not get config', error)
  }

  return (
    <div className={`${current_config?.tutorials ? 'container-with-tutorials' : ''}`}>
      <div className="container">
          <div className="Body withdraw">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={walletIcon} alt="walletIcon"/>
                      Withdraw Statecoins
                  </h2>
                  <div>
                      <Link className="nav-link" to="/home">
                          <StdButton
                              label="Back"
                              className="Body-button transparent"/>
                      </Link>
                  </div>
              </div>
              <h3 className="subtitle">
                  Withdraw Statecoin UTXO’s back to Bitcoin. <br/>
                <b> {fromSatoshi(balance_info.total_balance)} BTC</b> as <b>{balance_info.num_coins}</b> {filterByMsg()}
              </h3>
          </div>

          <div className="withdraw content">
              <div className="Body left ">
                  <div>
                      <h3 className="subtitle">Select Statecoin UTXO’s to withdraw</h3>
                      <span className="sub">Click to select UTXO’s below</span>
                      <Coins
                        showCoinStatus={true}
                        displayDetailsOnClick={false}
                        selectedCoins={selectedCoins}
                        setSelectedCoin={addSelectedCoin}
                        refresh={refreshCoins}/>
                    </div>

              </div>
              <div className="Body right">
                  <div className="header">
                      <h3 className="subtitle">Transaction Details</h3>
                      <div>
                          <select
                            onChange={handleFeeSelection}
                            value={txFeePerKB}
                          >
                          <option value={txFeePerByteList[0]}>Low {toSatoshi(txFeePerByteList[0]/1000)} sat/B</option>
                          <option value={txFeePerByteList[1]}>Med {toSatoshi(txFeePerByteList[1]/1000)} sat/B</option>
                          <option value={txFeePerByteList[2]}>High {toSatoshi(txFeePerByteList[2]/1000)} sat/B</option>
                          </select>
                          <span className="small">Transaction Fee</span>
                      </div>
                  </div>

                  <div>
                      <AddressInput
                        inputAddr={inputAddr}
                        onChange={onInputAddrChange}
                        placeholder='Destination Address for withdrawal'
                        smallTxtMsg='Your Bitcoin Address'/>
                  </div>

                  <div>
                      <p className="table-title">Use Only:</p>
                      <table>
                          <tbody>
                          <tr>
                              <td>
                                  <input
                                      name="isGoing"
                                      type="checkbox"
                                      />
                              </td>
                              <td>
                                  <img src={orange} alt="walletIcon"/>
                                  <span>UTXO’s with a High Privacy Score <br/> Balance: <b>0.55 BTC</b></span>
                              </td>
                          </tr>
                          </tbody>
                      </table>
                      <button type="button" className="btn" onClick={withdrawButtonAction}>
                          <img src={withdrowIcon} alt="withdrowIcon"/>
                          Withdraw btc</button>
                  </div>
              </div>
          </div>
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}


export default withRouter(WithdrawPage);
