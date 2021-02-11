import settings from "../../images/settings.png";

import React from 'react';
import {Link, withRouter} from "react-router-dom";

import {StdButton, Quantity} from "../../components";
import {callGetConfig} from '../../features/WalletDataSlice'


import './Settings.css';

class SettingsPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {isToggleOn: true};
        this.config = callGetConfig();
        // This binding is necessary to make `this` work in the callback
        this.handleNotification = this.handleNotification.bind(this);
        this.handleTutorial = this.handleTutorial.bind(this);
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

                                    <input id="address" type="text" name="Electrumx Address" required/>
                                    <label className="control-label"
                                           htmlFor="address">{this.config.electrum_config.host}</label>
                                </div>
                                <div className="inputs-item">
                                    <input id="proxy" type="text" name="Tor Proxy" required/>
                                    <label className="control-label" htmlFor="proxy">{this.config.tor_proxy}</label>
                                </div>
                                <div className="inputs-item">
                                    <input id="entity-address" type="text" name="StateChain Entity Address" required/>
                                    <label className="control-label"
                                           htmlFor="entity-address">{this.config.state_entity_endpoint}</label>
                                </div>
                                <div className="inputs-item">
                                    <input id="conductor-address" type="text" name="Swap Conductor Address" required/>
                                    <label className="control-label"
                                           htmlFor="conductor-address">{this.config.swap_conductor_endpoint}</label>
                                </div>
                            </form>
                            <Quantity label="Minimum Anonymity Set Size"/>

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
                            className="Body-button blue"/>
                    </div>

                </div>
            </div>
        )
    }
}


export default withRouter(SettingsPage);
