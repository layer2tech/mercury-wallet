import settings from "../../images/settings.png";

import React from 'react';
import {Link, withRouter} from "react-router-dom";

import { StdButton, Quantity } from "../../components";

import './Settings.css';

const SettingsPage = () => {
  return (
    <div className="container">

      <div className="Body settings">
          <div className="swap-header">
              <h2 className="WalletAmount">
                  <img src={settings} alt="question"/>
                  Settings
              </h2>
              <div >
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

                      <div>
                          <input type="text" name="Electrumx Address" placeholder="Electrumx Address" />
                      </div>
                    <div>
                        <input type="text" name="Tor Proxy" placeholder="Tor Proxy"/>
                    </div>
                      <div>
                          <input type="text" name="StateChain Entity Address" placeholder="StateChain Entity Address"/>
                      </div>
                       <div>
                           <input type="text" name="Swap Conductor Address" placeholder="Swap Conductor Address"/>
                       </div>
                   </form>
                   <Quantity label="Minimum Anonymity Set Size" />
                   <StdButton label="PubliSh black-out transaction"
                              className="Body-button blue"/>
               </div>
               <div className="inputs">
                   <h2>Date/Time Format</h2>
                   <select name="1" id="1">
                       <option value="1">mm/dd/yyyy HH:mm:ss</option>
                   </select>
                  <div className="btns">
                      <div className="btns-radios">
                          <label htmlFor="s1">Notifications</label>
                          <input id="s1" type="checkbox" className="switch" />
                      </div>
                      <span>Description of the kind of notifications</span>
                  </div>
                   <div className="btns">
                       <div className="btns-radios">
                           <label htmlFor="s1">Tutorials</label>
                           <input id="s1" type="checkbox" className="switch" />
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

export default withRouter(SettingsPage);
