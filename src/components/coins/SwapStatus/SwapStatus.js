import React from 'react';

const SwapStatus = (props) => {
    return(
        <div>
            {props.swapStatus? (
                <div  className = "swap-status">
                    <p className="main">{props.swapStatus}</p>
                    {props.swapStatus ? (props.swapStatus.slice(0,7)==="Phase 3/8"? (<div className="new-tor-id"><p>New Tor ID</p></div>):(null)) : (null)}
                    <p className="short">{props.swapStatus.slice(0,7)+'/8'}</p>
                </div>):(null)}
        </div>
    )
}

export default SwapStatus;