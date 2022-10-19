'use strict';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {useLocation} from 'react-router-dom';
import { fromSatoshi } from '../../wallet/util';
import {
  callGetUnspentStatecoins,
  updateBalanceInfo,
  callGetUnconfirmedStatecoinsDisplayData,
  callGetUnconfirmedAndUnmindeCoinsFundingTxData,
  callGetStateCoin,
  handleEndAutoSwap,
  setIntervalIfOnline,
  updateInSwapValues,
  checkSwapAvailability,
  callUpdateSwapGroupInfo
} from '../../features/WalletDataSlice';
import SortBy from './SortBy/SortBy';
import FilterBy from './FilterBy/FilterBy';
import { STATECOIN_STATUS } from '../../wallet/statecoin';
import EmptyCoinDisplay from './EmptyCoinDisplay/EmptyCoinDisplay';
import './coins.css';
import '../index.css';
import './DeleteCoin/DeleteCoin.css'

import {
  callDoSwap
} from "../../features/WalletDataSlice";
import Coin from "./Coin/Coin";
import { coinSort, getPrivacyScoreDesc } from "./CoinFunctionUtils/CoinFunctionUtils";

const TESTING_MODE = require("../../settings.json").testing_mode;

const DEFAULT_STATE_COIN_DETAILS = { show: false, coin: { value: 0, expiry_data: { blocks: "", months: "", days: "" }, privacy_data: { score_desc: "" }, tx_hex: null, withdraw_tx: null } }
// privacy score considered "low"
const LOW_PRIVACY = 2;
// style time left timer as red after this many days
export const DAYS_WARNING = 5;

const INITIAL_COINS = {
  unspentCoins: [],
  unConfirmedCoins: []
}

const INITIAL_SORT_BY = {
  direction: 0,
  by: 'value'
};

export const SWAP_STATUS_INFO = {
  SingleSwapMode: "Inqueue",
  Phase0: "Phase 0/8: registration",
  Phase1: "Phase 1/8: awaiting swap commitments",
  Phase2: "Phase 2/8: awaiting blind token",
  Phase3: "Phase 3/8: new Tor circuit",
  Phase4: "Phase 4/8: awaiting transfer address",
  Phase5: "Phase 5/8: transferring statecoin",
  Phase6: "Phase 6/8: receiving new statecoin",
  Phase7: "Phase 7/8: finalizing transfers",
  Phase8: "Phase 8/8: completing swap",
  End: "End",
}

const CoinsList = (props) => {
  const location = useLocation();
  const dispatch = useDispatch();
  
  
  const { selectedCoins, isMainPage } = props;
  
  const { filterBy, swapPendingCoins, swapRecords, coinsAdded,
    coinsRemoved, torInfo, inSwapValues, balance_info, swapLoad,
    showDetails, warning_dialogue } = useSelector(state => state.walletData);
    
    
  const [swap, setSwapPage] = useState(location.pathname === "/swap_statecoin");
  const [state, setState] = useState({});

  const [sortCoin, setSortCoin] = useState({ ...INITIAL_SORT_BY, condition: swap ? 'swap' : null });

  const [coins, setCoins] = useState(INITIAL_COINS);

  const [initCoins, setInitCoins] = useState({});


  let all_coins_data = [...coins.unspentCoins, ...coins.unConfirmedCoins];


  //Load coins once component done render
  useEffect(() => {
    // This Use effect gets latest coin data and triggers rerenders when coin data has changed

    let isMounted = true
    const [coins_data] = callGetUnspentStatecoins();
    //Load all coins that are confirmed

    let unconfirmed_coins_data = dispatch(callGetUnconfirmedStatecoinsDisplayData);
    //Load unconfirmed coins

    let undeposited_coins_data = dispatch(callGetUnconfirmedAndUnmindeCoinsFundingTxData)
    //Load coins that haven't yet been sent BTC ( init coins )
    if (isMounted === true) {
      if (validCoinData(coins_data, unconfirmed_coins_data)) {
        setCoins({
          unspentCoins: coins_data,
          unConfirmedCoins: unconfirmed_coins_data
        })
      }

      setInitCoins(undeposited_coins_data);

      // Update total_balance in Redux state
      if (filterBy !== 'default') {
        const coinsByStatus = filterCoinsByStatus([...coins_data, ...unconfirmed_coins_data], filterBy);
        const total = coinsByStatus.reduce((sum, currentItem) => sum + currentItem.value, 0);
        dispatch(updateBalanceInfo({ ...balance_info, total_balance: total, num_coins: coinsByStatus.length }));
      } else {
        const coinsNotWithdraw = coins_data.filter(coin => (
          coin.status !== STATECOIN_STATUS.WITHDRAWN &&
          coin.status !== STATECOIN_STATUS.WITHDRAWING &&
          coin.status !== STATECOIN_STATUS.IN_TRANSFER &&
          coin.status !== STATECOIN_STATUS.EXPIRED));
        const total = coinsNotWithdraw.reduce((sum, currentItem) => sum + currentItem.value, 0);
        if(!swap){
          dispatch(updateBalanceInfo({ ...balance_info, total_balance: total, num_coins: coinsNotWithdraw.length }));
        }
      }
      return () => { isMounted = false }
    }
  }, [props.refresh, filterBy, 
    dispatch, coinsAdded, 
    coinsRemoved, swapPendingCoins, 
    swapRecords, inSwapValues,
    showDetails,
    // Refresh coinslist on showDetails change
    // when InfoModal opens & closes so:
    // If description is added the change appears immediately
    warning_dialogue,
    // When coin deleted: CoinsList rerenders
    // coin is removed from list immediately
    swap
  ]);

  // Re-fetch every 5 seconds and update state to refresh render
  // IF any coins are marked UNCONFIRMED
  useEffect(() => {

    let isMounted = true;

    let interval = setIntervalIfOnline(updateUnconfirmedUnspentCoins, torInfo.online, 5000, isMounted)

    return () => {
      isMounted = false;
      clearInterval(interval)};  
  }, [coins.unConfirmedCoins, torInfo.online, balance_info]);


  // Re-fetch swaps group data every and update swaps component
  // Initiate auto swap
  useEffect(() => {
    let isMounted = true;
    let interval = setIntervalIfOnline(swapInfoAndAutoSwap, torInfo.online, 3000, isMounted)
    return () => {
      isMounted = false;  
      clearInterval(interval)  
    };
  },
    [swapPendingCoins, inSwapValues, torInfo.online, dispatch]);

  const [totalCoins, setTotalCoins] = useState(0);

  // notes:
  // this method calls a couple renders a minute as coins_data is always changing, but not as much as all_coins_data does
  // need to look at why, see line all_coins_data.map

  // If possible this should be in header component: where the balance is
  useEffect(() => {
    const [coins_data] = callGetUnspentStatecoins();
    // given that coins_data.amounts cannot change later
    // its safe to assume that the length of coins would have to change for total amounts to change
    if (coins_data.length > 0 && totalCoins != coins_data.length) {
      const confirmedCoins = coins_data.filter(coin => (
        coin.status !== STATECOIN_STATUS.WITHDRAWN &&
        coin.status !== STATECOIN_STATUS.WITHDRAWING &&
        coin.status !== STATECOIN_STATUS.IN_TRANSFER &&
        coin.status !== STATECOIN_STATUS.EXPIRED
      ));
      // save the total amount to check later
      setTotalCoins(confirmedCoins.length);
      // update balance and amount
      const total = confirmedCoins.reduce((sum, currentItem) => sum + currentItem.value, 0);

      if(!swap){
        dispatch(updateBalanceInfo({ ...balance_info, total_balance: total, num_coins: confirmedCoins.length }))
      }
    }
  }, [callGetUnspentStatecoins, balance_info, swap])


  const filterCoinsByStatus = (coins = [], status) => {
    return coins.filter(coin => coin.status === status);
  }



  const validCoinData = (coins_data, new_unconfirmed_coins_data) => {
    let validA = true;
    let validB = true;

    // do not delete coins
    if (coins_data === undefined || coins_data === null || coins_data.length === 0) {
      validA = false;
    }

    if (new_unconfirmed_coins_data === undefined || new_unconfirmed_coins_data === null || new_unconfirmed_coins_data.length === 0) {
      validB = false;
    }

    //  if either of these stay true, let it set coins as there is data
    return (validA || validB);
  }


  // Enters/Re-enters coins in auto-swap
  const autoSwapLoop = () => {
    if (torInfo.online === false) return
    if (!swapPendingCoins?.length) {
      return
    }

    let swapValues = new Set(inSwapValues)
    let selectedCoins = []

    for (let i = 0; i < swapPendingCoins.length; i++) {
      let selectedCoin = swapPendingCoins[i]
      let statecoin = callGetStateCoin(selectedCoin);
      if (statecoin && checkSwapAvailability(statecoin, swapValues)) {
        swapValues.add(statecoin.value)
        selectedCoins.push(statecoin)
      }
    }
    dispatch(updateInSwapValues([...swapValues]))

    for (let i = 0; i < selectedCoins.length; i++) {
      let statecoin = selectedCoins[i]
      dispatch(callDoSwap({ "shared_key_id": statecoin.shared_key_id }))
        .then(res => {
          handleEndAutoSwap(dispatch, statecoin, statecoin.shared_key_id, res, fromSatoshi)
        });
    }
  }

  const swapInfoAndAutoSwap = (isMounted) => {
    if (torInfo.online != true || isMounted != true) return
    autoSwapLoop()
    if (props?.setRefreshSwapGroupInfo) {
      props.setRefreshSwapGroupInfo((prevState) => !prevState);
    }
  }


  const updateUnconfirmedUnspentCoins = () => {
    setState({});
    // in the case torInfo is undefined this should still run

    let new_unconfirmed_coins_data = callGetUnconfirmedStatecoinsDisplayData();
    // check for change in length of unconfirmed coins list and total number
    // of confirmations in unconfirmed coins list
    // check for change in the amount of blocks per item (where the main expiry date is set

    let [new_confirmed_coins_data] = callGetUnspentStatecoins();
    //Get all updated confirmed coins & coin statuses

    if (
      coins.unConfirmedCoins.length !== new_unconfirmed_coins_data.length
      ||
      coins.unConfirmedCoins.reduce((acc, item) => acc + item.expiry_data.confirmations, 0)
      !==
      new_unconfirmed_coins_data.reduce((acc, item) => acc + item.expiry_data.confirmations, 0)
      ||
      coins.unConfirmedCoins.reduce((acc, item) => acc + item.expiry_data.blocks, 0)
      !==
      new_unconfirmed_coins_data.reduce((acc, item) => acc + item.expiry_data.blocks, 0)
      ||
      coins.unConfirmedCoins.length !== new_confirmed_coins_data.length
    ) {
      if (validCoinData(new_confirmed_coins_data, new_unconfirmed_coins_data)) {
        setCoins({
          unspentCoins: new_confirmed_coins_data,
          unConfirmedCoins: new_unconfirmed_coins_data
        })
      }
    }
  }

  // Filter coins by status
  if (filterBy === 'default') {
    all_coins_data = all_coins_data.filter(coin => (coin.status !== STATECOIN_STATUS.WITHDRAWN && coin.status !== STATECOIN_STATUS.IN_TRANSFER))
  } else {
    if (filterBy === STATECOIN_STATUS.WITHDRAWN) {
      all_coins_data = filterCoinsByStatus(all_coins_data, STATECOIN_STATUS.WITHDRAWN);
    }
    if (filterBy === STATECOIN_STATUS.IN_TRANSFER) {
      all_coins_data = filterCoinsByStatus(all_coins_data, STATECOIN_STATUS.IN_TRANSFER);
    }
  }

  all_coins_data.sort(coinSort(sortCoin));

  if (!all_coins_data.length) {//&& filterBy !== STATECOIN_STATUS.WITHDRAWN && filterBy !== STATECOIN_STATUS.IN_TRANSFER

    let displayMessage = "Your wallet is empty";

    if (filterBy === STATECOIN_STATUS.WITHDRAWN
    ) {
      displayMessage = "No coins confirmed withdrawn."
    }

    if (filterBy === STATECOIN_STATUS.IN_TRANSFER) {
      displayMessage = "No coins transferred."
    }

    return (
      <EmptyCoinDisplay message={displayMessage} />
    );
  }

  return (
    <div
      className={`main-coin-wrap ${!all_coins_data.length ? 'no-coin' : ''} ${filterBy} ${!props.largeScreen ? 'small-screen' : ''}`}>
      <div className="sort-filter">
        <FilterBy />
        {(all_coins_data.length &&
          filterBy !== STATECOIN_STATUS.WITHDRAWN
        ) ? <SortBy sortCoin={sortCoin} setSortCoin={setSortCoin} swap={swap} /> : null}
      </div>
      {all_coins_data.map(item => {
        item = {...item, privacy_data: getPrivacyScoreDesc(item)}
        return (
          <Coin
            key={item.shared_key_id}
            showCoinStatus={props.showCoinStatus} // all clear - boolean
            coin_data={item} // FIX
            isMainPage={isMainPage} // all clear - boolean
            selectedCoin={props.selectedCoin} // Check
            selectedCoins={selectedCoins} // Check
            setSelectedCoin={props.setSelectedCoin} // Check this causes rerendering
            displayDetailsOnClick={props.displayDetailsOnClick} // All clear - boolean
            setCoinDetails={props.setCoinDetails} // Check
            render={ props.render ? (props.render) : null}

          />
        )
      })}

    </div>
  );
}

export default CoinsList;
