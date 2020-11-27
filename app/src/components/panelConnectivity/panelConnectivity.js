import React, {Component} from "react";
import './panelConnectivity.css';
import arrow from '../../images/arrow-accordion.svg';
import '../index.css';
import StdButton from "../buttons/standardButton";


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
            <div className="Body small">
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
                    <div onClick={this.toggleContent} className="image">
                        <img src={arrow} alt="arrowIcon"/>
                    </div>
                </div>

                <div className={this.state.isToggleOn ? "show" : ' hide'}>
                    <p>Body Here</p>
                </div>
            </div>
        );
    }
}


export default PanelConnectivity;
