import React, {Component} from "react";
import './panelConnectivity.css';
import arrow from '../../images/arrow-accordion.png';
import '../index.css';




class PanelConnectivity extends Component {
    constructor() {
        super();
        this.state = {
            name: "React"
        };
        this.state = {isToggleOn: false};

        this.onValueChange = this.onValueChange.bind(this);
        this.toggleContent = this.toggleContent.bind(this);
    }

    onValueChange(event) {
        this.setState({
            selectedOption: event.target.value
        });
    }

    toggleContent(event) {
        this.setState({isToggleOn: !this.state.isToggleOn})
    }

    render() {

        return (
            <div className="Body small accordion">
                <div className="Collapse">
                    <div className="ConnectionStateChain">

                        <label>
                            <input
                                type="radio"
                                value="StateChain"
                                checked={this.state.selectedOption === "StateChain"}
                                onChange={this.onValueChange}
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
                                checked={this.state.selectedOption === "Swaps"}
                                onChange={this.onValueChange}
                            />
                            Connected to Swaps
                            <span className="checkmark"></span>
                        </label>
                    </div>
                    <div onClick={this.toggleContent} className={this.state.isToggleOn ? "image rotate"  : ' image '} >
                        <img src={arrow} alt="arrowIcon"/>
                    </div>
                </div>

                <div className={this.state.isToggleOn ? "show" : ' hide'}>
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
}


export default PanelConnectivity;
