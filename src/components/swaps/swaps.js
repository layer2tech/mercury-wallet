import coin from "../../images/table-icon1.png";
import user from "../../images/table-icon-user.png";

import React, {useState, useEffect} from 'react';
import {Modal} from 'react-bootstrap';
import {useDispatch} from 'react-redux'

import {callGetSwapGroupInfo, callUpdateSwapGroupInfo} from '../../features/WalletDataSlice'

import './swaps.css';
import '../index.css';

const DEFAULT_SWAP_DETAILS = {show: false, swap: {value: 0, participants: 0, capacity: 0, status: "none"}}


const Swaps = (props) => {
    const dispatch = useDispatch();

    const [swapGroupsData, setSwapGroupsData] = useState([]);

    // The following group of functions will be used when user can select a particular
    // swap group to join.
    const [showSwapDetails, setShowSwapDetails] = useState(DEFAULT_SWAP_DETAILS);  // Display details of swap in Modal
    // Set selected swap
    const selectSwap = (shared_key_id) => {
        shared_key_id === props.selectedSwap ? props.setSelectedSwap(null) : props.setSelectedSwap(shared_key_id);
    }
    // Check if swap is selected. If so return CSS.
    const isSelectedStyle = (shared_key_id) => {
        return props.selectedSwap === shared_key_id ? {backgroundColor: "#e6e6e6"} : {}
    }
    // Convert expiry_data to string displaying months or days left
    const expiry_time_to_string = (expiry_data) => {
        return expiry_data.months > 0 ? expiry_data.months + " months" : expiry_data.days + " days"
    }

    // Re-fetch swaps every 3 seconds and update state to refresh render
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch(callUpdateSwapGroupInfo());
            let swap_groups_data = callGetSwapGroupInfo();
            let swap_groups_array = swap_groups_data ? Array.from(swap_groups_data.entries()) : new Array();
            setSwapGroupsData(swap_groups_array) //update state to refresh TransactionDisplay render
        }, 3000);
        return () => clearInterval(interval);
      },
      []);

    const swapData = swapGroupsData.map(([key,value]) => (
        <div key={key.amount} value={value}>
        <div>
        <div className="SwapPanel">
            <div className="SwapAmount-block">
                <img src={coin} alt="coin"/>
                <span className="sub">
                    <b className="SwapAmount">  {key.amount/1e8} BTC</b>
                </span>
            </div>

            <b className="SwapParticipants">
                <img src={user} alt="user"/>
                <span className="sub">
                    <b className="SwapParticipants">  {value}/{key.size} </b>
                </span>
            </b>

            <b className="SwapStatus">
                <span className="sub">
                    {value < key.size && false &&
                        <b className="SwapStatus"> Waiting for participants... </b>
                    }
                    {value >= key.size && false &&
                        <b className="SwapStatus"> Swap in progress... </b>
                    }
                </span>
            </b>
            </div>
        </div>
        </div>

    ));

    return (
        <div>
            {swapData.length!==0 ? swapData : <p>Loading swap group information...</p>}
        </div>
    );
}

export default Swaps;
