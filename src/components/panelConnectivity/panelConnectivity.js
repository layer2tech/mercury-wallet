import arrow from '../../images/arrow-accordion.png';

import React, {useState} from "react";

import './panelConnectivity.css';
import '../index.css';


const PanelConnectivity = () => {
    const [state, setState] = useState({isToggleOn: false});

    const onValueChange = (event) => {setState({selectedOption: event.target.value})}

    const toggleContent = (event) => {setState({isToggleOn: !state.isToggleOn})}

    return (
        <div className="Body small accordion">
            <div className="Collapse">
                <div className="ConnectionStateChain">
                    <label>
                        <input
                            type="radio"
                            value="StateChain"
                            checked={state.selectedOption === "StateChain"}
                            onChange={onValueChange}
                        />
                        Connected to StateChain
                        <span className="checkmark"></span>
                    </label>
                </div>
                <div className="ConnectionSwaps">
                    <label>
                        <input
                            type="radio"
                            value="Swaps"
                            checked={state.selectedOption === "Swaps"}
                            onChange={onValueChange}
                        />
                        Connected to Swaps
                        <span className="checkmark"></span>
                    </label>
                </div>
                <div onClick={toggleContent} className={state.isToggleOn ? "image rotate"  : ' image '} >
                    <img src={arrow} alt="arrowIcon"/>
                </div>
            </div>

            <div className={state.isToggleOn ? "show" : ' hide'}>
                <div className="collapse-content">
                    <div className="collapse-content-item">
                        <span>xxx.xxx.x.xx</span>
                        <div>
                            <span className="txt">Deposit Fee: <b>1000</b></span>
                            <span className="txt">Withdraw Fee: <b>1000</b></span>
                        </div>
                    </div>

                    <div className="collapse-content-item">
                        <span>xxx.xxx.x.xx</span>
                        <div>
                            <span className="txt">Pending Swaps: <b>13</b></span>
                            <span className="txt">Participants: <b>56</b></span>
                            <span className="txt">Total pooled BTC: <b>34.3</b></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PanelConnectivity;
