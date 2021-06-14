import React from 'react';
import Moment from 'react-moment';

import { fromSatoshi } from '../../wallet/util'
import { callGetActivityLog } from '../../features/WalletDataSlice'

import txidIcon from '../../images/txid-icon.png';
import createIcon from '../../images/create-icon-dep.png';
import transferIcon from '../../images/transfer-icon.png';
import withrowIcon from '../../images/withrow-icon.png';
import swapIcon from '../../images/swap-icon-grey.png';

import './activity.css';

const Activity = () => {
    let activity_data = callGetActivityLog();
	if(activity_data?.length) {
		activity_data = activity_data.sort((a, b) => {
			return b?.date - a?.date;
		})
	}
	const mergeActivityByDate = () => {
		if(!activity_data.length) return [];
		let allActivity = {};
		activity_data.forEach(item => {
			let dateStr = new Date(item.date).toLocaleDateString();
			if(allActivity.hasOwnProperty(dateStr)) {
				allActivity[dateStr].push(item);
			} else {
				allActivity[dateStr] = [item];
			}
		})
		return Object.values(allActivity);
	};

	const activityDataMergeDate = mergeActivityByDate();
    const activitiesTableData = activityDataMergeDate.map((activityGroup, groupIndex) => (
        <div key={groupIndex}>
            <div className="date">
                <Moment format="MMMM D, YYYY">{activityGroup[0]?.date}</Moment>
            </div>
			{activityGroup.map((item, index) => (
				<div key={index}>

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
									<span className="txid">{item.funding_txid}</span>

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
									<span className="txid">{item.funding_txid}</span>

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
									<span className="txid">{item.funding_txid}</span>

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
									<span className="txid">{item.funding_txid}</span>

								</td>
								<td>
									<span>Swapped</span>
									<span className="green"> {fromSatoshi(item.value)} BTC</span>

								</td>
							</tr>
						</tbody>
					</table>
					: null }
				</div>
			))}
        </div>
    ))
    return (
        <div >
			{activitiesTableData}
        </div>
    )
}
export default Activity
