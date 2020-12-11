import React, { Component } from "react";
import "../../containers/Withdraw/Withdraw.css";

class inputPage extends Component {
    state = {
        value: 0
    }

    decrease = () => {
        this.setState({ value: this.state.value - 1 });
    }

    increase = () => {
        this.setState({ value: this.state.value + 1 });
    }

    render() {
        return (
            <div className="def-number-input number-input">
                <button onClick={this.decrease} className="minus"></button>
                <span className="smalltxt">Value (BTC)</span>
                <input className="quantity" name="quantity" value={this.state.value} onChange={()=> console.log('change')}
                       type="number" placeholder="0 BTC" />
                <button onClick={this.increase} className="plus"></button>
            </div>
        );
    }
}

export default inputPage;
