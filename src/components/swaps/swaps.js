import coin from "../../images/table-icon1.png";
import user from "../../images/table-icon-user.png";

import React, {useState, useEffect} from 'react';

import { Spinner } from "react-bootstrap";

import {fromSatoshi} from '../../wallet'

import './swaps.css';
import '../index.css';

const DEFAULT_SWAP_DETAILS = {show: false, swap: {value: 0, participants: 0, capacity: 0, status: "none"}}


const Swaps = (props) => {
    const [countdown, setCountdown] = useState()
    const [swapTime,setSwapTime] = useState("")
    const [count,setCount] = useState(0)

    useEffect(() =>{
        if(props.swapGroupsData.length !== 0){
            let time = props.swapGroupsData[0][1].time
        
            if(swapTime !== time){
                setSwapTime(props.swapGroupsData[0][1].time)
            }
        
        }

    },[props.swapGroupsData])

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

    const digits = (number) => number<10 ? ("0"+number):(number)

    const handleCountdownTimer = (countdown) => {
        let hours=0;
        let minutes=0;
        let seconds=0;
        if(countdown>=0){
            hours = Math.floor(countdown/(60*60))
            minutes = Math.floor((countdown-(hours*3600))/60)
            seconds = countdown%60
        }
        else{
            hours = 0
            minutes = 0
            seconds = 0
        }
        let countdownTime = `${digits(hours)}:${digits(minutes)}:${digits(seconds)}`
        return countdownTime
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
                <span>Swaps waiting to begin …</span>
                <div className={"clock"}>
                    <span className={countdown<30? "red":(null)}>{countdown ? (`${handleCountdownTimer(countdown)}s`):(null)}</span>
                </div>
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
