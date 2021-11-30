import React from 'react';

const SwapStatus = (props) => {
    return(
        <div>
            {props.swapStatus? (
                <div  className = "swap-status">
                    <p className="main">{props.swapStatus}</p>
                    {props.swapStatus ? (props.swapStatus.slice(0,7)==="Phase 3/4"? (<div className="new-tor-id"><p>New Tor ID</p></div>):(null)) : (null)}
                    <p className="short">{props.swapStatus.slice(0,7)+'/4'}</p>
                </div>):(null)}
        </div>
    )
}

export default SwapStatus;