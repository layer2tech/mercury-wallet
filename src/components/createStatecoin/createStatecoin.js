import plus from "../../images/plus-deposit.png";

import React, {useState} from 'react';

import '../../containers/Deposit/Deposit.css';

const CreateStatecoin = (props) => {

    const [state, setState] = useState({isToggleOn: false});
    const toggleContent = (event) => {
      console.log("toggel")
      setState({isToggleOn: !state.isToggleOn})}

    const chosenSelectionPanel = (
          <div className="Body">
              <div className="deposit-main">
                  <span>Selected Statecoin Value</span>
                  <div className="deposit-statecoins">
                      <div className="numbers">
                          <div className="numbers-item">
                              <span><b>0.001</b> BTC</span>
                              <span>Liquidity: <b>High</b></span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )
      
    const newSelectionPanel = (
        <div className="Body">
            <div className="deposit-main">
                <span>Select Statecoin Value</span>
                <div className="deposit-statecoins">
                    <div className="numbers">
                        <div className="numbers-item">
                            <span><b>0.001</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>
                        <div className="numbers-item">
                            <span><b>0.0025</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>
                        <div className="numbers-item">
                            <span><b>0.005</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>
                        <div className="numbers-item">
                            <span><b>0.01</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>
                        <div className="numbers-item">
                            <span><b>0.1</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>
                        <div className="numbers-item">
                            <span><b>0.25</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>
                        <div className="numbers-item">
                            <span><b>0.5</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>
                        <div className="numbers-item">
                            <span><b>1</b> BTC</span>
                            <span>Liquidity: <b>High</b></span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div>
            {chosenSelectionPanel}
            {newSelectionPanel}
            <div className="Body">
            <span className={state.isToggleOn ? "create-title"  : ' create-title '} onClick={toggleContent}>
                <img src={plus} alt="plus"/>
                CREATE ANOTHER STATECOIN
            </span>
            </div>
        </div>
    )
}

export default CreateStatecoin;
