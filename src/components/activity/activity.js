'use strict';
import React from 'react';
import Moment from 'react-moment';
import { fromSatoshi } from '../../wallet/util'
import {
	callGetActivityLogItems, callGetAllStatecoins,
	callGetSwappedStatecoinsByFundingOutPoint
} from '../../features/WalletDataSlice'
import txidIcon from '../../images/txid-icon.png';
import createIcon from '../../images/create-icon-dep.png';
import transferIcon from '../../images/transfer-icon.png';
import withrowIcon from '../../images/withrow-icon.png';
import swapIcon from '../../images/swap-icon-grey.png';
import EmptyCoinDisplay from '../coins/EmptyCoinDisplay/EmptyCoinDisplay';
import './activity.css';
import { ActivityLog } from '../../wallet/activity_log';

const Activity = () => {
	let activity_data = callGetActivityLogItems();

	function shortenString(long) {
		let short = ""
		if (long != null) {
			if (long.length > 6) {
				short = short.concat(long.slice(0, 6), "...")	
			} else {
				short = long
			}
		}
		return short
	}

	function swapOutPointString(funding_out_point, date) {
		let outPoint = swapOutPoint(funding_out_point, date);
		if (!outPoint){
			return "Data not found"
		} else{
			return `${shortenString(outPoint.txid)}:${outPoint.vout}`
		}
	}

	function swapOutPoint(funding_out_point, date) {
		let dateIndexArray = activity_data.filter(item =>
			item.funding_txid === funding_out_point.txid && 
			item.funding_txvout === funding_out_point.vout &&
			item.action === "S")
		// Filter activity for txid and swap actions

		dateIndexArray = dateIndexArray.map(item => item.date).sort((a, b) => b - a)
		//sort filtered activity by date (most recent to least recent)

		let dateIndex = dateIndexArray.indexOf(date)
		// Get index of swapped coin

		// Filter all statecoins for swapped TxID and sort by date (most recent to least recent)
		let swappedCoins = callGetSwappedStatecoinsByFundingOutPoint(funding_out_point, dateIndexArray.length);
		swappedCoins = swappedCoins ?	swappedCoins.sort((a, b) => a.date - b.date).reverse() : undefined;
		// Should load this activity data into Redux state so dont have to keep getting it from store ? - whenever it runs the ui is unusable

		// Check data exists : some unforeseen error
		//Get the data for the swap of coin with funding_txid
		let datedSwappedCoins = swappedCoins ? swappedCoins[dateIndex] : undefined;

		if (!datedSwappedCoins) {
			return datedSwappedCoins
		} else {
			let finalUtxo = datedSwappedCoins?.swap_transfer_finalized_data?.state_chain_data?.utxo;
			return {
				txid: finalUtxo?.txid,
				vout: finalUtxo?.vout
			}
		}
	}

	if (activity_data?.length) {
		activity_data = activity_data.sort((a, b) => {
			return b?.date - a?.date;
		})
	}

	activity_data = ActivityLog.filterDuplicates(activity_data)

	const mergeActivityByDate = () => {
		return ActivityLog.mergeActivityByDate(activity_data)
	};

	let activityDataMergeDate = mergeActivityByDate();
	
	const activitiesTableData = activityDataMergeDate.map((activityGroup, groupIndex) => (
		<div key={groupIndex}>
			<div className="date">
				<Moment format="MMMM D, YYYY">{activityGroup[groupIndex]?.date}</Moment>
			</div>
			{activityGroup.map((item, index) => (
				<div key={index}>

					{item.action === 'D' ?
						<table>
							<tbody>
								<tr >
									<td>
										<img src={createIcon} alt="createIcon" />
										<span> <Moment format="HH:mm:ss A">{item.date}</Moment> </span>
										<span className="black">Created 1 Statecoin</span>
									</td>
									<td>
										<img src={txidIcon} alt="txidIcon" />
										<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

									</td>
									<td>
										<span>Deposited</span>
										<span className="green">+ {fromSatoshi(item.value)} BTC</span>

									</td>
								</tr>
							</tbody>
						</table>
						: null}
					{item.action === 'T' ?
						<table>
							<tbody>
								<tr >
									<td>
										<img src={transferIcon} alt="transferIcon" />
										<span><Moment format="HH:mm:ss A">{item.date}</Moment> </span>
										<span className="black">Transferred 1 Statecoin</span>
									</td>
									<td>
										<img src={txidIcon} alt="txidIcon" />
										<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

									</td>
									<td>
										<span>Transferred</span>
										<span className="red">- {fromSatoshi(item.value)} BTC</span>
									</td>
								</tr>
							</tbody>
						</table>
						: null}
					{item.action === 'W' ?
						<table>
							<tbody>
								<tr >

									<td>
										<img src={withrowIcon} alt="withrowIcon" />
										<span className="grey"><Moment format="HH:mm:ss A">{item.date}</Moment> </span>
										<span >Confirm withdrawal</span>
									</td>
									<td>
										<img src={txidIcon} alt="txidIcon" />
										<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

									</td>
									<td>
										<span>Withdrawn</span>
										<span className="red">- {fromSatoshi(item.value)} BTC</span>

									</td>
								</tr>
							</tbody>
						</table>
						: null}
					{item.action === 'G' ?
						<table>
							<tbody>
								<tr >

									<td>
										<img src={withrowIcon} alt="withrowIcon" />
										<span className="grey"><Moment format="HH:mm:ss A">{item.date}</Moment> </span>
										<span >Withdrawn 1 Statecoin</span>
									</td>
									<td>
										<img src={txidIcon} alt="txidIcon" />
										<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

									</td>
									<td>
										<span>Withdrawn</span>
										<span className="red">- {fromSatoshi(item.value)} BTC</span>

									</td>
								</tr>
							</tbody>
						</table>
						: null}
					{item.action === 'S' ?
						<table className="swap-row-table" >
							<tbody>
								<tr>
									<td>
										<img src={withrowIcon} alt="withrowIcon" />
										<span className="grey"><Moment format="HH:mm:ss A">{item.date}</Moment> </span>
										<span >Swapped 1 Statecoin</span>
									</td>
									<td>
										<span className="tooltip" >
											<div><b>New TxID: </b>{swapOutPointString({ txid: item.funding_txid, vout: item.funding_txvout }, item.date)}</div>
											<div><b>Swapped TxId: </b>{shortenString(item.funding_txid)}:{item.funding_txvout}</div>
										</span>
										<img src={swapIcon} alt="txidIcon" />
										<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

									</td>
									<td>
										<span>Swapped</span>
										<span className="green"> {fromSatoshi(item.value)} BTC</span>

									</td>
								</tr>
							</tbody>
						</table>
						: null}
					{item.action === 'I' ?
						<table>
							<tbody>
								<tr >
									<td>
										<img src={withrowIcon} alt="createIcon" />
										<span><Moment format="HH:mm:ss A">{item.date}</Moment> </span>
										<span >Initialized 1 Statecoin</span>
									</td>
									<td>
										<span className="">No Transaction ID before Deposit</span>
									</td>
									<td>
										<span>Coin Initialized</span>
									</td>
								</tr>
							</tbody>
						</table>
						: null}
					{item.action === 'R' ?
						<table>
							<tbody>
								<tr>
									<td>
										<img src={withrowIcon} alt="receiveIcon" />
										<span><Moment format="HH:mm:ss A">{item.date}</Moment> </span>
										<span >Received 1 Statecoin</span>
									</td>
									<td>
										<img src={txidIcon} alt="txidIcon" />
										<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>
									</td>
									<td>
										<span>Coin Received</span>
										<span className="green">+ {fromSatoshi(item.value)} BTC</span>
									</td>
								</tr>
							</tbody>
						</table>
						: null}
				</div>
			))}
		</div>
	))
	let activity_data_len = activity_data.length
	activity_data = null;
	return (
		<div >
			{!activity_data_len ? (<EmptyCoinDisplay message="No activity recorded." />) : (activitiesTableData)}

		</div>
	)
	
}
export default Activity
