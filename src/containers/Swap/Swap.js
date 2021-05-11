import swapIcon from '../../images/swap_icon-blue.png';

import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'
import React, {useState, useEffect} from 'react';

import { Coins, Swaps, StdButton} from "../../components";
import {isWalletLoaded, setNotification, setError, callDoSwap, callSwapDeregisterUtxo,
  callGetSwapGroupInfo, callUpdateSwapGroupInfo} from '../../features/WalletDataSlice'
import {fromSatoshi} from '../../wallet'

import './Swap.css';

const SwapPage = () => {
  const dispatch = useDispatch();
  let disabled = false;

  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [selectedSwap, setSelectedSwap] = useState(null); // store selected swap_id
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render

  const [swapGroupsData, setSwapGroupsData] = useState([]);

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

  // Re-fetch swaps group data every 3 seconds and update swaps component
  useEffect(() => {
      const interval = setInterval(() => {
          dispatch(callUpdateSwapGroupInfo());
          let swap_groups_data = callGetSwapGroupInfo();
          let swap_groups_array = swap_groups_data ? Array.from(swap_groups_data.entries()) : new Array();
          setSwapGroupsData(swap_groups_array) //update state to refresh TransactionDisplay render
          setRefreshCoins((prevState) => !prevState);
      }, 3000);
      return () => clearInterval(interval);
    },
    []);

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    dispatch(setError({msg: "No Wallet loaded."}))
    return <Redirect to="/" />;
  }

  const swapButtonAction = async () => {
    // check statechain is chosen
    if (selectedCoins.length == 0) {
      dispatch(setError({msg: "Please choose a StateCoin to swap."}))
      return
    }
    selectedCoins.forEach(
      (selectedCoin) => {
        dispatch(callDoSwap({"shared_key_id": selectedCoin}))
          .then(res => {
            if (res.payload===null) {
              dispatch(setNotification({msg:"Coin "+selectedCoin+" removed from swap pool."}))
              return
            }
            if (res.error===undefined) {
              dispatch(setNotification({msg:"Swap complete for coin of value "+fromSatoshi(res.payload.value)+" with new id "+res.payload.shared_key_id}))
            }
          })
        // Refresh Coins list
        setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
      }
    );
      
      
    }

    const leavePoolButtonAction = (event) => {
      if (selectedCoins.length == 0) {
        dispatch(setError({msg: "Please choose a StateCoin to remove."}))
        return
      }
      try {
        selectedCoins.forEach(
          (selectedCoin) => {
            dispatch(callSwapDeregisterUtxo({"shared_key_id": selectedCoin}));
          }
        );
        // Refresh Coins list
        setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
      } catch (e) {
        event.preventDefault();
        dispatch(setError({msg: e.message}))
      }
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
                        showCoinStatus={true}
                        selectedCoins={selectedCoins}
                        setSelectedCoin={addSelectedCoin}
                        setSelectedCoins={setSelectedCoins}
                        refresh={refreshCoins}/>
                  </div>

              </div>
              <div className="Body right">
                  <div>
                      <Swaps
                        swapGroupsData={swapGroupsData}
                        displayDetailsOnClick={false}
                        selectedSwap={selectedSwap}
                        setSelectedSwap={setSelectedSwap}
                      />
                  </div>
                  {swapGroupsData.length ? (
                    <div className="swap-footer-btns">
                      <button type="button" className="btn" onClick={swapButtonAction}>
                        Join Group
                      </button>
                      <button type="button" className="btn" onClick={leavePoolButtonAction}>
                        Leave Group
                      </button>
                    </div>
                  ) : null}
              </div>
          </div>
        </div>
      }
      </div>
  )
}

export default withRouter(SwapPage);
