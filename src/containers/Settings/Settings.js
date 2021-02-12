import settings from "../../images/settings.png";

import React from 'react';
import {Link, withRouter} from "react-router-dom";

import {StdButton} from "../../components";
import {callGetConfig} from '../../features/WalletDataSlice'


import './Settings.css';

class SettingsPage extends React.Component {
    constructor(props) {
        super(props);
        this.config = callGetConfig();
        this.label = props.label;
        this.state = {
            address: "",
            proxy: this.config.tor_proxy,
            entity_endpoint: this.config.state_entity_endpoint,
            min_anon_set: this.config.min_anon_set,
            swap_conductor_endpoint: this.config.swap_conductor_endpoint
        }

        this.handleNotification = this.handleNotification.bind(this);
        this.handleTutorial = this.handleTutorial.bind(this);

        this.handleAddressChange = this.handleAddressChange.bind(this);
        this.handleProxyChange = this.handleProxyChange.bind(this);
        this.handleEntityChange = this.handleEntityChange.bind(this);
        this.handleConductorChange = this.handleConductorChange.bind(this);
        this.handleNumberChange = this.handleNumberChange.bind(this);

    }

    handleNotification = () => {
        this.config.notifications = !this.config.notifications;
        document.getElementById('notification').checked = this.config.notifications;
        console.log(this.config.notifications + " notif");
    };

    handleTutorial = () => {
        this.config.tutorials = !this.config.tutorials;
        document.getElementById('tutorials').checked = this.config.tutorials;
        console.log(this.config.tutorials + " tutorial");
    };

    componentDidMount = () => {
        let notifications = this.config.notifications;
        let tutorials = this.config.tutorials;
        document.getElementById('notification').checked = notifications;
        document.getElementById('tutorials').checked = tutorials;
    }

    handleAddressChange(evt) {
        this.setState({address: evt.target.value});
    }

    handleProxyChange(evt) {
        this.setState({proxy: evt.target.value});
    }

    handleEntityChange(evt) {
        this.setState({entity_endpoint: evt.target.value});
    }

    handleConductorChange(evt) {
        this.setState({swap_conductor_endpoint: evt.target.value});
    }

    decrease = () => {
        this.setState({min_anon_set: this.state.value - 1});
    }

    increase = () => {
        this.setState({min_anon_set: this.state.value + 1});
    }

    handleNumberChange(evt) {
        this.setState({min_anon_set: evt.target.value});
    }


    saveButtonOnClick = (event) => {
        console.log("click!")
        // callUpdateConfig()

        console.log(this.state.address)
        console.log(this.state.proxy)
        console.log(this.state.entity_endpoint)
        console.log(this.state.swap_conductor_endpoint)
        console.log(this.state.value)
        event.preventDefault();
    }


    render() {

        return (
            <div className="container">
                <p> Settings page is under construction. </p>
                <div className="Body settings">
                    <div className="swap-header">
                        <h2 className="WalletAmount">
                            <img src={settings} alt="question"/>
                            Settings
                        </h2>
                        <div>
                            <Link className="nav-link" to="/">
                                <StdButton
                                    label="Back"
                                    className="Body-button transparent"/>
                            </Link>
                        </div>

                    </div>
                    <div className="buttons">
                        <Link className="nav-link" to="/">
                            <StdButton
                                label="Create wallet backup"
                                className="Body-button blue"/>
                        </Link>

                        <Link className="nav-link" to="/backup_tx">
                            <StdButton
                                label="Manage Back-up transactions"
                                className="Body-button blue"/>
                        </Link>

                        <Link className="nav-link" to="/">
                            <StdButton
                                label="Export activity log"
                                className="Body-button bg-transparent"/>
                        </Link>

                    </div>
                </div>
                <div className="Body settings">

                    <div className="content">
                        <div className="inputs">
                            <h2>Connectivity Settings</h2>
                            <form>

                                <div className="inputs-item">
                                    <input id="address" type="text" name="Electrumx Address" value={this.state.address}
                                           onChange={this.handleAddressChange} required/>
                                    <label className="control-label"
                                           htmlFor="address">Electrumx Server Address</label>
                                </div>
                                <div className="inputs-item">
                                    <input id="proxy" type="text" name="TorProxy" required
                                           value={this.state.proxy} onChange={this.handleProxyChange}/>
                                    <label className="control-label" htmlFor="proxy">Tor Proxy</label>
                                </div>
                                <div className="inputs-item">
                                    <input id="entity-address" type="text" name="StateChain Entity Address"
                                           value={this.state.entity_endpoint} onChange={this.handleEntityChange}
                                           required/>
                                    <label className="control-label"
                                           htmlFor="entity-address">State entity endpoint</label>
                                </div>
                                <div className="inputs-item">
                                    <input id="conductor-address" type="text" name="Swap Conductor Address"
                                           value={this.state.swap_conductor_endpoint}
                                           onChange={this.handleConductorChange} required/>
                                    <label className="control-label" htmlFor="conductor-address">Swap conductor
                                        endpoint</label>
                                </div>
                                <div className="inputs-item def-number-input number-input">
                                    <button onClick={this.decrease} className="minus"></button>
                                    <span className="smalltxt">{this.label}</span>
                                    <input className="quantity" name="quantity" value={this.state.value}
                                           type="number" placeholder="0 BTC"/>
                                    <button onClick={this.increase} className="plus"></button>
                                </div>
                            </form>

                        </div>
                        <div className="inputs">
                            <h2>Date/Time Format</h2>
                            <select name="1" id="1">
                                <option value="1">mm/dd/yyyy HH:mm:ss</option>
                            </select>
                            <div className="btns">

                                <div className="btns-radios">
                                    <label htmlFor="notification">Notifications</label>
                                    <input id="notification" type="checkbox" className="switch"
                                           onClick={this.handleNotification}/>
                                </div>
                                <span>Description of the kind of notifications</span>
                            </div>
                            <div className="btns">
                                <div className="btns-radios">
                                    <label htmlFor="tutorials">Tutorials</label>
                                    <input id="tutorials" type="checkbox" className="switch"
                                           onClick={this.handleTutorial}/>
                                </div>
                                <span>Description of the kind of notifications</span>
                            </div>
                        </div>
                    </div>
                    <div className="action-btns">
                        <StdButton
                            label="Cancel"
                            className="Body-button bg-transparent"/>
                        <StdButton
                            label="Save"
                            className="Body-button blue"
                            onClick={this.saveButtonOnClick}/>
                    </div>

                </div>
            </div>
        )
    }
}


export default withRouter(SettingsPage);
