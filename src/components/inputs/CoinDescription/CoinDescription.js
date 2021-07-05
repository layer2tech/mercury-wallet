import React, {useState} from 'react';

import close_img from "../../../images/close-icon.png";

import './CoinDescription.css';

const CoinDescription = (props) => {
    const handleSubmit = (e) => {
        if(e.key.charCodeAt(0) === 69){
            props.setDscrpnConfirm(true)
        }
    }

    return(
        <div className="description-coin-label">
            {props.dscrpnConfirm === true ? (
                <div className ="description-name" onClick={() => props.setDscrpnConfirm(false)}>
                    <p>{props.description}</p>
                </div>
            )
            :
            (<form onSubmit={() => props.setDscrpnConfirm(true)}>
                <input type="text" 
                    placeholder="Add a description..." 
                    value={props.description}  
                    onChange={props.handleChange}
                    onKeyPress={handleSubmit}/>


                {/* <span className="close-icon">
                    <img src={close_img} />
                </span> */}
            </form>
            
            )
            }

        </div>
    )
}

export default CoinDescription;