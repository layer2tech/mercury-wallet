import walletIcon from '../../images/walletIcon.png';
import orange from "../../images/wallet-orange.png";
import withdrowIcon from "../../images/withdrow-icon.png";

import {Link, withRouter, Redirect} from "react-router-dom";
import React, {useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {isWalletLoaded, callWithdraw, setError, setNotification} from '../../features/WalletDataSlice';
import {Coins, StdButton, AddressInput} from "../../components";
import {FILTER_BY_OPTION} from "../../components/panelControl/panelControl"
import {fromSatoshi} from '../../wallet/util';

import './Withdraw.css';

const WithdrawPage = () => {
  const dispatch = useDispatch();
  const { balance_info, filterBy } = useSelector(state => state.walletData);

  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [inputAddr, setInputAddr] = useState("");
  const onInputAddrChange = (event) => {
    setInputAddr(event.target.value);
  };
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render


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

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const withdrawButtonAction = async () => {
    // check statechain is chosen
    if (selectedCoins.length == 0) {
      dispatch(setError({msg: "Please choose a StateCoin to withdraw."}))
      return
    }
    if (!inputAddr) {
      dispatch(setError({msg: "Please enter an address to withdraw to."}))
      return
    }

    dispatch(callWithdraw({"shared_key_ids": selectedCoins, "rec_addr": inputAddr})).then((res => {
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


  return (
    <div className="container ">
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
                      setSelectedCoin={setSelectedCoin}
                      refresh={refreshCoins}/>
                  </div>

            </div>
            <div className="Body right">
                <div className="header">
                    <h3 className="subtitle">Transaction Details</h3>
                    <div>
                        <select name="1" id="1">
                            <option value="1">Low 7sat/B</option>
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
  )
}


export default withRouter(WithdrawPage);
