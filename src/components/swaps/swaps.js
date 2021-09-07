import coin from "../../images/table-icon1.png";
import user from "../../images/table-icon-user.png";
import React, {useState, useEffect} from 'react';
import { Spinner } from "react-bootstrap";
import {fromSatoshi} from '../../wallet'

import CountdownTimer from './CountdownTimer/CountdownTimer';

import './swaps.css';
import '../index.css';

// const DEFAULT_SWAP_DETAILS = {show: false, swap: {value: 0, participants: 0, capacity: 0, status: "none"}}

const Swaps = (props) => {
    const [countdown, setCountdown] = useState();
    const [swapTime,setSwapTime] = useState("");
    const [count,setCount] = useState(0);

    useEffect(() =>{
        if(props.swapGroupsData.length !== 0){
            let time = props.swapGroupsData[0][1].time;
            if(swapTime !== time){
                setSwapTime(props.swapGroupsData[0][1].time);
            }
        }
    },[props.swapGroupsData, swapTime]);


    useEffect(()=> {
        if(swapTime!==""){
            const interval = setInterval(()=>{
                setCountdown(swapTime - Math.ceil(Date.now()/1000))
                // setCount(count+1)
            },1000)
            return () => clearInterval(interval)
        }
    },[count,swapTime])

    // const getSwapStatusLabel = (value, groupStartTime) => {
    //     if(value === "0") {
    //         return (
    //             <div className="SwapStatus">
    //                 <span style={{background: '#f5f5f5'}}>Empty</span>
    //             </div>
    //         )
    //     }
    //     if(parseInt(value) > 1) {
    //         return (
    //             <div className="SwapStatus">
    //                 <span style={{color: '#dfeaff', background: '#757575'}}>Waiting</span>
    //             </div>
    //         )
    //     }
    //     if(parseInt(value) === 1) {
    //         return (
    //             <div className="SwapStatus">
    //                 <span style={{color: '#c8e6c9', background: '#757575'}}>Pending</span>
    //             </div>
    //         )
    //     }
    //     // if(value === total) {
    //     //     return (
    //     //         <div className="SwapStatus">
    //     //             <span style={{color: '#ffccbc', background: '#757575'}}>Complete</span>
    //     //         </div>
    //     //     )
    //     // }
    // }

    const utcTime = (swaptime) => {
        let utc = new Date(swaptime*1000).toISOString().slice(11,19);
        return utc      
    }

    const swapData = props.swapGroupsData.map(([key,value], index) => {
        if(count === 0){
            setCount(count+1);
        }
        return (
        <div key={index} className="swap-item-wrap">
            <div className="SwapAmount-block">
                <label>
                    <b>{fromSatoshi(key.amount)} {' '}</b> BTC
                </label>
            </div>
            <div className="SwapParticipants">
                <b>{value.number}/{key.size}</b>
            </div>
            {/* {getSwapStatusLabel(value.number)} */}
        </div>
        )});

    return (
        <div className="swap-coin">
            <div className="swap-top"> 
                <div className = "swap-title-item"><h5>Next Swap: </h5></div>
                <div className={"clock"}>
                    <CountdownTimer swapTime = {swapTime}/>
                </div>
                <div className={"utc_clock swap-title-item"}>
                    <span className={countdown<30? "red":(null)}>{swapTime ? `(${utcTime(swapTime)} UTC)`:(null)}</span>
                </div>
            </div>

            
            {swapData.length!==0 ? (
                <>
                    <div className="swap-table">
                        <h6 className="sub">Pending swap groups...</h6>
                        <div className="swap-table-head">
                            <span>
                                <img src={coin} alt="coin"/>
                                Value
                            </span>
                            <span>
                                <img src={user} alt="user"/>
                                PARTICIPANTS
                            </span>
                            {/* <span>Status</span> */}
                        </div>
                        <div className="swap-table-body">
                            {swapData}
                        </div>
                    </div>
                </>
            ) 
            : 
            (props.initFetchSwapGroups === true? 
                    (<Spinner animation="border" variant="primary" />)
                    :
                    (<p>No swap groups registered.</p>))}
        </div>
    );
}

export default Swaps;
