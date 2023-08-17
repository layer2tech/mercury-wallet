'use strict';
import './Swaps.css';
import '../index.css';

import coin from "../../images/table-icon1.png";
import user from "../../images/table-icon-user.png";
import {useState, useEffect} from 'react';
import { Spinner } from "react-bootstrap";
import {fromSatoshi} from '../../wallet'
import CountdownTimer from './CountdownTimer/CountdownTimer';
import { setIntervalIfOnline } from "../../features/WalletDataSlice";
import { useSelector } from "react-redux";

// const DEFAULT_SWAP_DETAILS = {show: false, swap: {value: 0, participants: 0, capacity: 0, status: "none"}}

const Swaps = (props) => {
    const [countdown, setCountdown] = useState();
    const [swapTime,setSwapTime] = useState("");
    const [count,setCount] = useState(0);

    const { torInfo } = useSelector(state => state.walletData);

    useEffect(() =>{
        if(props.swapGroupsData.length !== 0){
            let time = props.swapGroupsData[0][1].time;
            if(swapTime !== time){
                setSwapTime(props.swapGroupsData[0][1].time);
            }
        }
    },[props.swapGroupsData, swapTime]);

    useEffect(() => {
        let interval = null;
        let isMounted = true;
        if(swapTime!==""){
            interval = setIntervalIfOnline(countdownTimer, torInfo.online, 1000, isMounted);
        }
        return () => {
            isMounted = false;
            clearInterval(interval);
        }
    },[count,swapTime, torInfo.online])

    const countdownTimer = () => {
        setCountdown(swapTime - Math.ceil(Date.now()/1000))
    }

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
            {}
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
                            {}
                        </div>
                        <div className="swap-table-body">
                            {swapData}
                        </div>
                    </div>
                </>
            ) 
            : 
            (props.torOnline === true ?
                (props.initFetchSwapGroups === true? 
                        (<Spinner animation="border" variant="primary" />)
                        :
                        (<p>No swap groups registered.</p>))
                :
                (<p>Unable to retrieve swap group information - disconnected from the Mercury server.</p>))}
        </div>
    );
}

export default Swaps;
