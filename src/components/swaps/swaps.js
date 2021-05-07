import coin from "../../images/table-icon1.png";
import user from "../../images/table-icon-user.png";

import React, {useState, useEffect} from 'react';
import {Modal} from 'react-bootstrap';

import {fromSatoshi} from '../../wallet'

import './swaps.css';
import '../index.css';

const DEFAULT_SWAP_DETAILS = {show: false, swap: {value: 0, participants: 0, capacity: 0, status: "none"}}


const Swaps = (props) => {
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
    const swapData = props.swapGroupsData.map(([key,value], index) => (
        <div key={key.amount} className="swap-item-wrap">
            <div className="SwapAmount-block">
                <label>
                    <input
                        readOnly
                        type="radio"
                        checked={index === 0}
                    />
                    <b>{fromSatoshi(key.amount)} {' '}</b> BTC
                    <span className="checkmark"></span>
                </label>
            </div>
            <div className="SwapParticipants">
                <b>{value}/{key.size}</b>
                {index}
            </div>
            <div className="SwapStatus">
                {value < key.size &&
                    <span> Pending </span>
                }
                {value >= key.size &&
                    <span> Inprogress </span>
                }
            </div>
        </div>

    ));

    return (
        <div className="swap-coin">
            <div className="swap-top">
                <span>Swaps waiting to begin …</span>
                <span>
                    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9.01233 3.56494L5.00696 7.5603H8.01111V14.5798H10.0135V7.5603H13.0177L9.01233 3.56494ZM16.0218 17.594V10.5745H14.0192V17.594H11.015L15.0204 21.5894L19.0257 17.594H16.0218Z" fill="#666666" />
                    </svg>
                </span>
            </div>
            {swapData.length!==0 ? (
                <>
                    <div className="swap-table">
                        <div className="swap-table-head">
                            <span>
                                <img src={coin} alt="coin"/>
                                Value
                            </span>
                            <span>
                                <img src={user} alt="user"/>
                                PARTICIPANTS
                            </span>
                            <span>Status</span>
                        </div>
                        <div className="swap-table-body">
                            {swapData}
                        </div>
                    </div>
                </>
            ) : <p>Loading swap group information...</p>}
        </div>
    );
}

export default Swaps;
