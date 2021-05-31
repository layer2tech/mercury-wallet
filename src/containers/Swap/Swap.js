import swapIcon from '../../images/swap_icon-blue.png';

import {Link, withRouter, Redirect} from "react-router-dom";
import {useDispatch} from 'react-redux'
import React, {useState, useEffect} from 'react';

import { Coins, Swaps, StdButton, Tutorial} from "../../components";
import {
  isWalletLoaded,
  setNotification,
  setError,
  callDoSwap,
  callSwapDeregisterUtxo,
  callGetSwapGroupInfo,
  callUpdateSwapGroupInfo,
  callGetConfig
} from "../../features/WalletDataSlice";
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
    setSelectedCoins(
      prevSelectedCoins => {
        let newSelectedCoins=[];
        const isStatechainId = (element) => element == statechain_id; 
        let index = prevSelectedCoins.findIndex(isStatechainId);
        if (index == -1){
            newSelectedCoins=[statechain_id];
        }
        return newSelectedCoins;
      }
    );
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
  let current_config;
  try {
    current_config = callGetConfig();
  } catch(error) {
    console.warn('Can not get config', error)
  }

  return (
    <div className={`${current_config?.tutorials ? 'container-with-tutorials' : ''}`}>
      <div className="container ">
      {disabled===true ?
          <p> Swapping is currenlty not available. </p>
          :
          <>
            <div className="swap">
              <div className="wallet-container swap-header">
                  <div>
                    <h2 className="WalletAmount">
                      <svg width="30" height="41" viewBox="0 0 30 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.8848 6.31494V0.98291L7.77685 8.09131L14.8848 15.2007V9.86866C20.7773 9.86866 25.5483 14.6401 25.5483 20.5327C25.5483 22.3364 25.0967 24.0239 24.3135 25.5171L26.9092 28.1118C28.2861 25.9087 29.1045 23.3228 29.1045 20.5327C29.1045 12.6763 22.7412 6.31496 14.8848 6.31496L14.8848 6.31494ZM14.8848 31.1968C8.99414 31.1968 4.22119 26.4253 4.22119 20.5327C4.22119 18.7271 4.67432 17.0415 5.45605 15.5483L2.86181 12.9517C1.48486 15.1567 0.666992 17.7427 0.666992 20.5327C0.666992 28.3882 7.03027 34.7505 14.8848 34.7505V40.0825L21.9946 32.9741L14.8848 25.8647V31.1968Z" fill="#0054F4" />
                      </svg>
                        Swap Statecoins
                    </h2>
                    <h3 className="subtitle">Swap Statecoins to increase their Privacy Score</h3>
                  </div>
                  <Link className="nav-link" to="/home">
                      <StdButton
                          label="Back"
                          className="Body-button transparent"/>
                  </Link>
              </div>
              <div className="swap content">
                <div className="wallet-container left ">
                    <div>
                        <span className="sub">Click to select UTXO’s below</span>
                        <Coins
                          displayDetailsOnClick={false}
                          showCoinStatus={true}
                          selectedCoins={selectedCoins}
                          setSelectedCoin={addSelectedCoin}
                          setSelectedCoins={setSelectedCoins}
                          refresh={refreshCoins}
                          swap
                        />
                    </div>

                </div>
                <div className="wallet-container right">
                    <div>
                        <Swaps
                          swapGroupsData={swapGroupsData}
                          displayDetailsOnClick={false}
                          selectedSwap={selectedSwap}
                          setSelectedSwap={setSelectedSwap}
                        />
                    </div>
                      <div className="swap-footer-btns">
                        <button type="button" className="btn" onClick={swapButtonAction}>
                          Join Group
                        </button>
                        <button type="button" className="btn" onClick={leavePoolButtonAction}>
                          Leave Group
                        </button>
                      </div>
                </div>
              </div>
            </div>
        </>
      }
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}

export default withRouter(SwapPage);
