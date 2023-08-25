import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {useLocation} from 'react-router-dom';
import { addCoinToSwapRecords, addInSwapValue, addSwapPendingCoin, callDoAutoSwap, callDoSwap, callGetStateCoin, callSwapDeregisterUtxo, checkSwapAvailability, handleEndSwap, removeCoinFromSwapRecords, removeInSwapValue, removeSwapPendingCoin, setError, setSwapLoad } from "../../features/WalletDataSlice";
import { fromSatoshi } from "../../wallet";

const AutoSwapToggle = ({ coin_data }) => {
    const location = useLocation();
    const dispatch = useDispatch();
    
    const [swapPage, setSwapPage] = useState(location.pathname);
    
    const { torInfo, inSwapValues, swapLoad } = useSelector(state => state.walletData);

    const handleAutoSwap = async (item) => {
        if (item.status === 'UNCONFIRMED' || item.status === 'IN_MEMPOOL') {
          return;
        }
    
        let statecoin = callGetStateCoin(item.shared_key_id);
        // get the statecoin and set auto to true - then call auto_swap
        let selectedCoin = item.shared_key_id;
    
        // check statechain is chosen
        if (statecoin === undefined) {
          dispatch(setError({ msg: "Please choose a StateCoin to swap." }))
          return
        }
        if (swapLoad.join === true  && swapPage === "/swap_statecoin") {
          return
        }
    
        if (torInfo.online === false && item.swap_auto != true) {
          dispatch(setError({ msg: "Disconnected from the mercury server" }))
          return
        }
    
    
        // turn off swap_auto
        if (item.swap_auto) {
            
          dispatch(removeSwapPendingCoin(item.shared_key_id))
          dispatch(removeInSwapValue(statecoin.value))
          statecoin.swap_auto = false;
          dispatch(setSwapLoad({ ...swapLoad, leave: true }))
          try {
            
            await dispatch(callSwapDeregisterUtxo({ "shared_key_id": selectedCoin, "dispatch": dispatch, "autoswap": true }))
            dispatch(() => {
              removeCoinFromSwapRecords(selectedCoin)
            });
            dispatch(setSwapLoad({ ...swapLoad, leave: false }))
          } catch (e) {
            dispatch(setSwapLoad({ ...swapLoad, leave: false }))
            if (!e.message.includes("Coin is not in a swap pool")) {
              dispatch(setError({ msg: e.message }))
            }
          } finally {
            // Refresh Coins list
            // var timeout = setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
          }
          // return () =>  clearTimeout(timeout)
        } else {
          statecoin.swap_auto = true
          dispatch(callDoAutoSwap(selectedCoin));
          dispatch(addCoinToSwapRecords(selectedCoin));
          dispatch(setSwapLoad({ ...swapLoad, join: true, swapCoin: callGetStateCoin(selectedCoin) }));

    
          if (checkSwapAvailability(statecoin, new Set(inSwapValues))) {
            // if StateCoin in not already in swap group
            dispatch(addInSwapValue(statecoin.value))
            dispatch(callDoSwap({ "shared_key_id": selectedCoin }))
              .then(res => {
                handleEndSwap(dispatch, selectedCoin, res, setSwapLoad, swapLoad, fromSatoshi)
              })
          } else {

            dispatch(setSwapLoad({ ...swapLoad, join: false, swapCoin: callGetStateCoin(selectedCoin) }));
            dispatch(addSwapPendingCoin(item.shared_key_id))
          }
        }
    
        // Refresh Coins list
        // var timeout2 = setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
        // return () => clearTimeout(timeout2);
      }
    

    return(
        (swapPage === "/swap_statecoin" || swapPage === "/home") &&
        
        <div>
            <label className='toggle'>
            Auto-swap
            </label>
            <label className="toggle-sm">

            <input
                className="toggle-checkbox"
                type="checkbox"
                onChange={() => handleAutoSwap(coin_data)}
                checked={coin_data.swap_auto}
                disabled={(coin_data.status === "INITIALISED" || 
                coin_data.status === "EXPIRED" || 
                coin_data.status === "WITHDRAWING" ||
                coin_data.status === "WITHDRAWN" ||
                coin_data.status === "SWAPLIMIT" ||
                coin_data.status === "IN_MEMPOOL" ||
                coin_data.status === "UNCONFIRMED" ) ? true : false}
            />
            <div className="toggle-switch" />
            </label>
        </div>
    )
}

export default AutoSwapToggle;

