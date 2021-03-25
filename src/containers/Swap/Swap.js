import swapIcon from '../../images/swap_icon-blue.png';

import {Link, withRouter, Redirect} from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux'
import React, {useState} from 'react';

import { Coins, Swaps, StdButton} from "../../components";
import {isWalletLoaded, setNotification, setError, callDoSwap, callGetOngoingSwaps,
  callRemoveCoinFromSwap } from '../../features/WalletDataSlice'

  import './Swap.css';

const SwapPage = () => {
  const dispatch = useDispatch();
  let disabled = false;

  const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id
  const [selectedSwap, setSelectedSwap] = useState(null); // store selected swap_id
  const [inputAddr, setInputAddr] = useState("");

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    dispatch(setError({msg: "No Wallet loaded."}))
    return <Redirect to="/" />;
  }

  const swapButtonAction = async () => {
    // check statechain is chosen
    if (!selectedCoin) {
      dispatch(setError({msg: "Please choose a StateCoin to swap."}))
      return
    }

    dispatch(callDoSwap({"shared_key_id": selectedCoin}))
      .then(res => {
        if (res.payload===null) {
          dispatch(setNotification({msg:"Coin "+selectedCoin+" removed from swap pool."}))
          return
        }
        if (res.error===undefined) {
          console.log("res: ", res)
          dispatch(setNotification({msg:"Swap complete!"}))
        }
      })
    }

    const leavePoolButtonAction = () => {
      if (!selectedCoin) {
        dispatch(setError({msg: "Please choose a StateCoin to remove."}))
        return
      }
      callRemoveCoinFromSwap(selectedCoin)
    }

  return (
      <div className="container ">
      {disabled===true ?
          <p> Swapping is currenlty not available. </p>
          :

          <div className="Body swap">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={swapIcon} alt="swapIcon"/>
                      Swap Statecoins
                  </h2>
                  <div>
                      <Link className="nav-link" to="/home">
                          <StdButton
                              label="Back"
                              className="Body-button transparent"/>
                      </Link>
                  </div>
              </div>

          <div className="swap content">
              <div className="Body left ">
                  <div>
                      <h3 className="subtitle">Swap Statecoins to increase their Privacy Score</h3>
                      <span className="sub">Click to select UTXO’s below</span>
                      <Coins
                        displayDetailsOnClick={false}
                        selectedCoin={selectedCoin}
                        setSelectedCoin={setSelectedCoin}/>
                  </div>

              </div>
              <div className="Body right">
                  <div>
                      <Swaps
                      displayDetailsOnClick={false}
                      selectedSwap={selectedSwap}
                      setSelectedSwap={setSelectedSwap}
                      />
                  </div>
                  <button type="button" className="btn" onClick={swapButtonAction}>
                          SWAP STATECOIN UTXO
                  </button>
                  <button type="button" className="btn" onClick={leavePoolButtonAction}>
                          REMOVE STATECOIN UTXO FROM SWAP
                  </button>
              </div>
          </div>
        </div>
      }
      </div>
  )
}

export default withRouter(SwapPage);
