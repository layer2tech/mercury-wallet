import { Spinner } from 'react-bootstrap';
import { callGetBlockHeight } from '../WalletDataSlice';
import { STATECOIN_STATUS } from '../../wallet';
import anon_icon_none from "../../assets/images/table-icon-grey.png";
import anon_icon_low from "../../assets/images/table-icon-medium.png";
import anon_icon_high from "../../assets/images/table-icon.png";
import anon_icon2_none from "../../assets/images/close-grey.png";
import anon_icon2_high from "../../assets/images/check-grey.png";

const validExpiryTime = (expiry_data) => {
    let block_height = callGetBlockHeight()

    if (block_height === 0 || expiry_data.blocks === 0 || !block_height || expiry_data.blocks > block_height) {
      // set its actual block to 0 so next time we can return  '--' until an actual block is received
      expiry_data =  {...expiry_data, blocks: 0};
      return false;
    }

    if (expiry_data === -1) {
      return false
    }

    return true;
}

// Convert expiry_data to string displaying months or days left
const expiry_time_to_string = (expiry_data) => {
return expiry_data.months > 0 ? expiry_data.months + " months" : expiry_data.days + " days";
}

const getRemainingDays = (numberOfDays) => {
    let days = Math.floor(numberOfDays % 365 % 30);
    let daysDisplay = days > 0 ? days + (days === 1 ? " day" : " days") : "";
    return daysDisplay;
}

export const displayExpiryTime = (expiry_data, show_days = false) => {
    if (validExpiryTime(expiry_data)) {
      if (show_days && (expiry_data.days % 30) > 0) {
        return expiry_time_to_string(expiry_data) + " and " + getRemainingDays(expiry_data.days);
      } else {
        return expiry_time_to_string(expiry_data);
      }
    }
    return <Spinner animation="border" variant="primary" size='sm'></Spinner>;
}

// data to display in privacy related sections
export  const getPrivacyScoreDesc = (coin) => {

    let anon_set = coin?.anon_set ? coin.anon_set : 0
    let swap_rounds = coin?.swap_rounds ? coin.swap_rounds : 0

    if (coin?.is_deposited) {
      return {
        icon1: anon_icon_none,
        icon2: anon_icon2_none,
        score_desc: "Original",
        msg: " this statecoin was created in this wallet",
        rounds: "Original",
        rounds_msg: " this statecoin was created in this wallet",
      }
    }

    if (anon_set) {
      return {
        icon1: anon_icon_high,
        icon2: anon_icon2_high,
        score_desc: "Swap set: " + anon_set.toString(),
        rounds: `Swaps: ${swap_rounds}`,
        msg: " cumulative swap group size",
        rounds_msg: " number of swap rounds completed",
      }
    }

    return {
      icon1: anon_icon_low,
      icon2: anon_icon2_high,
      score_desc: "Swap set: " + anon_set.toString(),
      rounds: `Swaps: ${swap_rounds}`,
      msg: " cumulative swap group size",
      rounds_msg: " number of swap rounds completed",
    }
}

export const coinSort = (sortCoin) => {
    return (a, b) => {
      const conditionalProp = sortCoin?.condition;
  
      //List coins that are available to swap first.
      if (conditionalProp === 'swap') {
        const a_available = ((a.status === STATECOIN_STATUS.AVAILABLE) || (a.ui_swap_status !== null))
        const b_available = ((b.status === STATECOIN_STATUS.AVAILABLE) || (b.ui_swap_status !== null))
        if (a_available !== b_available) {
          return a_available ? -1 : 1
        }
      }
      let compareProp = sortCoin.by;
      if (compareProp === 'expiry_data') {
        a = (parseInt(a[compareProp]['months']) * 30) + parseInt(a[compareProp]['days']);
        b = (parseInt(b[compareProp]['months']) * 30) + parseInt(b[compareProp]['days']);
      } else {
        a = a[compareProp];
        b = b[compareProp];
      }
      if (a > b) {
        return sortCoin.direction ? 1 : -1;
      } else if (a < b) {
        return sortCoin.direction ? -1 : 1;
      }
      return 0;
    }
}

export const getParticipantsByCoinValue = (swap_group_data, amount) => {
  for (let i = 0; i < swap_group_data.length; i++) {
    if (swap_group_data[i][0].amount === amount) {
      return swap_group_data[i][1].number;
    }
  }
  return 0; // Return 0 if no matching amount is found
}