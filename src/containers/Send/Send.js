import orange from "../../images/wallet-orange.png";
import arrow from "../../images/arrow-up.png"

import React from 'react';
import {Link, withRouter} from "react-router-dom";

import { Coins, Quantity, StdButton } from "../../components";

import './Send.css';

const SendStatecoinPage = () => {

    return (
        <div className="container ">
            <div className="Body sendStatecoin">
                <div className="swap-header">
                    <h2 className="WalletAmount">
                        <img src={arrow} alt="arrow"/>
                        Send Statecoins
                    </h2>
                    <div>
                        <Link className="nav-link" to="/">
                            <StdButton
                                label="Back"
                                className="Body-button transparent"/>
                        </Link>
                    </div>
                </div>
                <h3 className="subtitle">
                   <b> 2.55 BTC</b> available as <b>13</b> Statecoins
                </h3>


            </div>

            <div className="sendStatecoin content">
                <div className="Body left ">
                    <div>
                        <h3 className="subtitle">Select Statecoin UTXO’s to Send</h3>
                        <span className="sub">Click to select UTXO’s below</span>
                        <Coins />
                    </div>

                </div>
                <div className="Body right">
                    <div className="header">
                        <h3 className="subtitle">Transaction Details</h3>
                        <div>
                            <select name="1" id="1">
                                <option value="1">Low 7sat/B</option>
                            </select>
                            <span className="small">Transaction Fee</span>
                        </div>

                    </div>
                    <div>
                       <div className="inputs">
                           <input type="text" placeholder="Destination Address for withdrawal"/>

                           <span className="smalltxt">Your Bitcoin Address</span>
                       </div>
                        <div className="inputs">
                           <Quantity label="Value (BTC)" />
                        </div>
                    </div>
                    <div>
                        <p className="table-title">Use Only:</p>
                        <table>
                            <tbody>
                            <tr>
                                <td>
                                    <input
                                        name="isGoing"
                                        type="checkbox"
                                        />
                                </td>
                                <td>
                                    <img src={orange} alt="walletIcon"/>
                                    <span>UTXO’s with a High Privacy Score <br/> Balance: <b>0.55 BTC</b></span>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                        <button type="button" className="btn">
                            SEND STATECOIN UTXO’S
                        </button>
                    </div>
                </div>
            </div>


        </div>
    )
}

export default withRouter(SendStatecoinPage);
