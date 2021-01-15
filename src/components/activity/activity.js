import './activity.css';
import txidIcon from '../../images/txid-icon.png';
import Moment from 'react-moment';
import createIcon from '../../images/create-icon-dep.png';
import transferIcon from '../../images/transfer-icon.png';
import withrowIcon from '../../images/withrow-icon.png';
import swapIcon from '../../images/swap-icon-grey.png';

import React from 'react';
import { useSelector } from 'react-redux'

import { fromSatoshi } from '../../wallet/util'

const Activity = () => {
    const activity_data = useSelector(state => state.walletData).activity_data;
    const activitiesTableData = activity_data.map((item, index) => (
        <div key={index}>
            <div className="date">

                <Moment format="MMMM D, YYYY">{item.date}</Moment>
            </div>
            {item.action === 'D' ?
            <table>
            <tbody>
              <tr >
                  <td>
                      <img src={createIcon} alt="createIcon"/>
                      <span> <Moment format="HH:mm A">{item.date}</Moment> </span>
                      <span className="black">Created 1 Statecoin</span>
                  </td>
                  <td>
                      <img src={txidIcon} alt="txidIcon"/>
                      <span className="txid">{item.txid}</span>

                  </td>
                  <td>
                      <span>Deposited</span>
                      <span className="green">+ {fromSatoshi(item.value)} BTC</span>

                  </td>
              </tr>
            </tbody>
            </table>
            : null }
            {item.action === 'T' ?
            <table>
            <tbody>
              <tr >
                  <td>
                      <img src={transferIcon} alt="transferIcon"/>
                      <span><Moment format="HH:mm A">{item.date}</Moment> </span>
                      <span className="black">Created 1 Statecoin</span>
                  </td>
                  <td>
                      <img src={txidIcon} alt="txidIcon"/>
                      <span className="txid">{item.txid}</span>

                  </td>
                  <td>
                      <span>Transfer</span>
                      <span className="green">+ {fromSatoshi(item.value)} BTC</span>
                  </td>
              </tr>
            </tbody>
            </table>
            : null }
            {item.action === 'W' ?
            <table>
            <tbody>
              <tr >

                  <td>
                      <img src={withrowIcon} alt="withrowIcon"/>
                      <span className="grey"><Moment format="HH:mm A">{item.date}</Moment> </span>
                      <span >Created 1 Statecoin</span>
                  </td>
                  <td>
                      <img src={txidIcon} alt="txidIcon"/>
                      <span className="txid">{item.txid}</span>

                  </td>
                  <td>
                      <span>Withdraw</span>
                      <span className="red">- {fromSatoshi(item.value)} BTC</span>

                  </td>
              </tr>
            </tbody>
            </table>
            : null }
            {item.action === 'S' ?
            <table>
            <tbody>
              <tr >
                  <td>
                      <img src={withrowIcon} alt="withrowIcon"/>
                      <span className="grey"><Moment format="HH:mm A">{item.date}</Moment> </span>
                      <span >Created 1 Statecoin</span>
                  </td>
                  <td>
                      <img src={swapIcon} alt="txidIcon"/>
                      <span className="txid">{item.txid}</span>

                  </td>
                  <td>
                      <span></span>
                      <span className="red"></span>

                  </td>
              </tr>
            </tbody>
            </table>
            : null }
        </div>
    ))
    return (
        <div >
              {activitiesTableData}
        </div>
    )
}
export default Activity
