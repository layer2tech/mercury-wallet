import coin from "../../images/table-icon1.png";
import user from "../../images/table-icon-user.png";

import React, {useState, useEffect} from 'react';
import {Modal} from 'react-bootstrap';

import {fromSatoshi} from '../../wallet'

import './swaps.css';
import '../index.css';

const DEFAULT_SWAP_DETAILS = {show: false, swap: {value: 0, participants: 0, capacity: 0, status: "none"}}


const Swaps = (props) => {
    const getSwapStatusLabel = (value, total) => {
        if(value === 0) {
            return (
                <div className="SwapStatus">
                    <span style={{background: '#f5f5f5'}}>Empty</span>
                </div>
            )
        }
        if(parseInt(total) - parseInt(value) > 1) {
            return (
                <div className="SwapStatus">
                    <span style={{color: '#dfeaff', background: '#757575'}}>Awaiting</span>
                </div>
            )
        }
        if(parseInt(total) - parseInt(value) === 1) {
            return (
                <div className="SwapStatus">
                    <span style={{color: '#c8e6c9', background: '#757575'}}>Pending</span>
                </div>
            )
        }
        if(value === total) {
            return (
                <div className="SwapStatus">
                    <span style={{color: '#ffccbc', background: '#757575'}}>Complete</span>
                </div>
            )
        }
    }
    const swapData = props.swapGroupsData.map(([key,value], index) => (
        <div key={index} className="swap-item-wrap">
            <div className="SwapAmount-block">
                <label>
                    <b>{fromSatoshi(key.amount)} {' '}</b> BTC
                </label>
            </div>
            <div className="SwapParticipants">
                <b>{value}/{key.size}</b>
            </div>
            {getSwapStatusLabel(value, key.size)}
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
            ) : <p>No swap groups registered.</p>}
        </div>
    );
}

export default Swaps;
