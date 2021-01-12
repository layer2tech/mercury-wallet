import React, {Component} from 'react';
import '../../containers/Deposit/Deposit.css';
import plus from "../../images/plus-deposit.png";


class CreateStatecoin extends Component {

    constructor() {
        super();
        this.state = {
            name: "React"
        };
        this.state = {isToggleOn: false};

        this.toggleContent = this.toggleContent.bind(this);
    }
    toggleContent(event) {
        this.setState({isToggleOn: !this.state.isToggleOn})
    }


    render() {
        return (
            <div>
                <div className={this.state.isToggleOn ? "Body add show" : ' Body add hide'}>
                    test
                </div>
                <div className="Body">
                    <div className="deposit-main">
                        <span>Select Statecoin Value</span>
                        <div className="deposit-statecoins">
                            <div className="numbers">
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>
                                <div className="numbers-item">
                                    <span><b>0.0005</b> BTC</span>
                                    <span>Liquidity: <b>High</b></span>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
                <div className="Body">
                <span className={this.state.isToggleOn ? "create-title"  : ' create-title '} onClick={this.toggleContent}>
                    <img src={plus} alt="plus"/>
                    CREATE ANOTHER STATECOIN
                </span>
                </div>
            </div>
        )
    }
}

export default CreateStatecoin;
