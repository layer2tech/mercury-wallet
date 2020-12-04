import React from 'react';
import { useTable } from 'react-table'
import './activity.css';
import { Wallet } from '../../wallet/wallet'
import txidIcon from '../../images/txid-icon.svg';
import Moment from 'react-moment';
import createIcon from '../../images/create-icon-dep.svg';
import transferIcon from '../../images/transfer-icon.svg';
import withrowIcon from '../../images/withrow-icon.svg';
import swapIcon from '../../images/swap-icon-grey.svg';


function Activity() {

    const wallet = Wallet.buildMock()
    const activities = wallet.getHistory(10)

    console.log(activities)



    const activitiesTableData = activities.map(item => (

        <div>
            <div className="date">

                <Moment format="MMMM D, YYYY">{item.date}</Moment>
            </div>
            {item.action == 'D' ?  <tr >

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
                    <span className="green">+ {item.value} BTC</span>

                </td>
            </tr>: null }
            {item.action == 'T' ?   <tr >

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
                    <span className="green">+ {item.value} BTC</span>

                </td>
            </tr> : null }
            {item.action == 'W' ?    <tr >

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
                    <span className="red">- {item.value} BTC</span>

                </td>
            </tr> : null }
            {item.action == 'S' ?    <tr >

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
            </tr> : null }

        </div>


    ))


    return (

        <table >

            <tbody >

            {activitiesTableData}
            </tbody>
        </table>
    )
}
export default Activity
