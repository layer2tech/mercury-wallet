import React from 'react';

const SwapStatus = (props) => {

    const stringIncludes = (str, include_str) => {
        if( str ) return str.includes(include_str)
    }
    const errorPTag = (phrase) => {
        return(
            <div>
                <p className = "main" >{phrase}</p>
                <p className = "short" >{phrase}</p>
            </div>
        )
        //doesnt appear on short screen
    }

    const getInteger = (str) => {
        let splitArray = str.split(':')
        return parseInt(splitArray[splitArray.length-1])
    }

    const sec2min = (num) => {
        const integer = parseInt(num/60)
        if(integer === 0){
            return "<1"
        }
        return integer
    }

    return(
        <div>
            {props.swap_error ? ( 
                <div  className = "swap-status">
                    {stringIncludes(props.swap_error.msg, "not found in swap") ? (errorPTag("Awaiting timeout...")) : (null)}
                    {stringIncludes(props.swap_error.msg, "waiting for completion") ? (errorPTag("Awaiting completion...")) : (null)}
                    {stringIncludes(props.swap_error.msg, "timed out") ? (errorPTag("Awaiting timeout...")) : (null)}
                    {stringIncludes(props.swap_error.msg, "punishment") ? errorPTag(`Penalty: ${sec2min(getInteger(props.swap_error.msg))} mins`) : (null)}
                    {stringIncludes(props.swap_error.msg, "active swap") ? errorPTag(`Timeout: ${sec2min(getInteger(props.swap_error.msg))} mins`) : (null)}
                    {/* Change/add  errors with server change, punishment indication should show minutes remaining for wait*/}
                </div>
             ):(props.swapStatus ? (
                <div  className = "swap-status">
                    <p className="main">{props.swapStatus}</p>
                    {props.swapStatus ? (props.swapStatus.slice(0,7)==="Phase 3/8"? (<div className="new-tor-id"><p>New Tor ID</p></div>):(null)) : (null)}
                    <p className="short">{props.swapStatus.slice(0,7)+'/8'}</p>
                </div>):( null ))}
        </div>
    )
}

export default SwapStatus;