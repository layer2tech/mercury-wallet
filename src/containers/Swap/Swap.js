import React from 'react';
import './Swap.css';

import {Link, withRouter} from "react-router-dom";
import swapIcon from '../../images/swap_icon-blue.png';
import StdButton from "../../components/buttons/standardButton";

import close from "../../images/close-icon.png";
import number from "../../images/number-icon.png";
import cyrcle from "../../images/cyrcle-icon.png";
import coin from "../../images/table-icon1.png";
import user from "../../images/table-icon-user.png";
import time from "../../images/table-icon-time.png";


const SwapPage = () => {

  let disabled = false;

  return (
      <div className="container ">
      {disabled===false ?
          <p> Swapping is currenlty not available. </p>
          :

          <div className="Body swap">
              <div className="swap-header">
                  <h2 className="WalletAmount">
                      <img src={swapIcon} alt="swapIcon"/>
                      Swap Statecoins
                  </h2>
                  <div>
                      <Link className="nav-link" to="/">
                          <StdButton
                              label="Back"
                              className="Body-button transparent"/>
                      </Link>
                  </div>
              </div>
              <h3 className="subtitle">Swap Statecoins to increase their Privacy Score</h3>
              <div className="swap-header-txt">
                  <div className="ConnectionSwaps">
                      <label>
                          <input
                              type="radio"
                              value="Swaps"
                              // {/*checked*/}
                          />
                          Connected to Swaps
                          <span className="checkmark"></span>
                      </label>
                  </div>
                  <div className="collapse-content-item">
                      <span>xxx.xxx.x.xx</span>
                      <div>
                          <span className="txt">Pending Swaps:
                              <b>13</b>
                          </span>
                          <span className="txt">Participants:
                              <b>56</b>
                          </span>
                          <span className="txt">Total pooled BTC:
                              <b>34.3</b>
                          </span>
                      </div>
                  </div>
              </div>


          <div className="swap content">
              <div className="Body left ">
                  <div>
                      <h3 className="subtitle">Swap Statecoins to increase their Privacy Score</h3>
                      <span className="sub">Click to select UTXO’s below</span>
                      <table>
                          <tbody>
                              <tr>
                                  <td>
                                      <div className="content">
                                          <img src={cyrcle} alt="swapIcon"/>

                                          <div className="txt">
                                              <span className="">0.0005 BTC</span>
                                              <div className="line">
                                                  <img src={close} alt="swapIcon"/>
                                                  <span>No Privacy Score</span>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <img src={number} alt="swapIcon"/>
                                      <span>15kje…398hj</span>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>

              </div>
              <div className="Body right">
                  <div>
                      <h3 className="subtitle">Swaps waiting to begin …</h3>
                      <table className="second">
                          <thead>
                              <tr>
                                  <td>
                                      <img src={coin} alt="coin"/>
                                      VALUE
                                  </td>
                                  <td>
                                      <img src={user} alt="user"/>
                                      PARTICIPANTS
                                  </td>
                                  <td>
                                      <img src={time} alt="time"/>
                                      INTERVAL
                                  </td>
                                  <td>STATUS</td>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <input type="text" name="name"/>
                                      <span>0.0005 BTC</span>
                                  </td>
                                  <td>
                                      <span>13/15</span>
                                  </td>
                                  <td>
                                      <span>5 Blocks Left</span>
                                  </td>
                                  <td>
                                      <span className="status">PENDING</span>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
        </div>
      }
      </div>
  )
}

export default withRouter(SwapPage);
