import React from 'react';
import Moment from 'react-moment';
import { fromSatoshi } from '../../wallet/util'
import { callGetActivityLogItems,callGetAllStatecoins } from '../../features/WalletDataSlice'
import txidIcon from '../../images/txid-icon.png';
import createIcon from '../../images/create-icon-dep.png';
import transferIcon from '../../images/transfer-icon.png';
import withrowIcon from '../../images/withrow-icon.png';
import swapIcon from '../../images/swap-icon-grey.png';
import EmptyCoinDisplay from '../coins/EmptyCoinDisplay/EmptyCoinDisplay';
import './activity.css';

const Activity = () => {
    let activity_data = callGetActivityLogItems();
	let statecoins = callGetAllStatecoins();

	function shortenString(long){
		let short = ""
		short = short.concat(long.slice(0,6),"...")
		return short
	}

	function swapTxid(funding_txid, date){
		let dateIndexArray = activity_data.filter(item => item.funding_txid === funding_txid && item.action === "S" )
		// Filter activity for txid and swap actions

		dateIndexArray = dateIndexArray.map(item => item.date).sort((a,b) => b-a)
		//sort filtered activity by date (most recent to least recent)

		let dateIndex = dateIndexArray.indexOf(date)
		// Get index of swapped coin
		
		let swappedCoins = statecoins.filter(coin => coin.funding_txid === funding_txid && coin.status === "SWAPPED").sort((a,b) => a.date - b.date).reverse()
		// Filter all statecoins for swapped TxID and sort by date (most recent to least recent)

		if(swappedCoins.length > 0){
		// Check data exists : some unforeseen error

			let finalSwapData = swappedCoins[dateIndex].swap_transfer_finalized_data
			//Get the data for the swap of coin with funding_txid

			return shortenString(finalSwapData.state_chain_data.utxo.txid)
		}
		else{
			return "Data not found"
		}
	}

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
    const activitiesTableData = activityDataMergeDate.map((activityGroup, groupIndex) =>(
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
									<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

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
									<span className="black">Transferred 1 Statecoin</span>
								</td>
								<td>
									<img src={txidIcon} alt="txidIcon"/>
									<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

								</td>
								<td>
									<span>Transferred</span>
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
									<span >Withdrawn 1 Statecoin</span>
								</td>
								<td>
									<img src={txidIcon} alt="txidIcon"/>
									<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

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
					<table className = "swap-row-table" >

						<tbody>
							<span className = "tooltip" >
								<div><b>New TxID: </b>{swapTxid(item.funding_txid,item.date)}:{item.funding_txvout}</div>
								<div><b>Swapped TxId: </b>{shortenString(item.funding_txid)}:{item.funding_txvout}</div>
							</span>
							<tr>
								<td>
									<img src={withrowIcon} alt="withrowIcon"/>
									<span className="grey"><Moment format="HH:mm A">{item.date}</Moment> </span>
									<span >Swapped 1 Statecoin</span>
								</td>
								<td>
									<img src={swapIcon} alt="txidIcon"/>
									<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

								</td>
								<td>
									<span>Swapped</span>
									<span className="green"> {fromSatoshi(item.value)} BTC</span>

								</td>
							</tr>
						</tbody>
					</table>
					: null }
					{item.action === 'I'?
					<table>
					<tbody>
						<tr >
							<td>
								<img src={withrowIcon} alt="createIcon"/>
								<span><Moment format="HH:mm A">{item.date}</Moment> </span>
								<span >Initialized 1 Statecoin</span>
							</td>
							<td>
								<img src={txidIcon} alt="txidIcon"/>
								<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>

							</td>
							<td>
								<span>Coin Initialized</span>
							</td>
						</tr>
					</tbody>
					</table>
					:null}
					{item.action === 'R'?
    				<table>
						<tbody>
							<tr>
								<td>
									<img src={withrowIcon} alt="receiveIcon"/>
									<span><Moment format="HH:mm A">{item.date}</Moment> </span>
									<span >Received 1 Statecoin</span>
								</td>
									<td>
										<img src={txidIcon} alt="txidIcon"/>
										<span className="txid">{item.funding_txid}:{item.funding_txvout}</span>
									</td>
									<td>
										<span>Coin Received</span>
									</td>
							</tr>
						</tbody>
					</table>
					:null}
			</div>
			))}
        </div>
    ))
    return (
        <div >
			{!activity_data.length? (<EmptyCoinDisplay message="No activity recorded."/>):(activitiesTableData)}

        </div>
    )
}
export default Activity
