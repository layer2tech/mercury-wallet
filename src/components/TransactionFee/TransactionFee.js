'use strict';

import React, {useState, useEffect} from 'react';
import { useDispatch } from 'react-redux';
import { callGetFeeEstimation } from '../../features/WalletDataSlice';

const TransactionFee = ({txFeePerB, setTxFeePerB}) => {
    const dispatch = useDispatch();

    const [customFee,setCustomFee] = useState(false);
    const [txFees,setTxFees] = useState([{block: 6, fee: 7,id:1},{block: 3, fee:8,id:2},{block:1, fee:9,id:3}]);

    // Get Tx fee estimate
    useEffect(() => {
        let isMounted = true
        let blocks = txFees.map(item => item.block)
        // list of # of blocks untill confirmation

        let txFeeEstimations = []

        blocks.map(block => {
        dispatch(callGetFeeEstimation(parseInt(block))).then(tx_fee_estimate => {
            if ( isMounted === true ) {
            if (tx_fee_estimate.payload > 0) {
                // Add fee to list
                let feeEst = tx_fee_estimate.payload
            
                txFeeEstimations = [...txFeeEstimations,
                { block: block, fee: feeEst, id: (txFeeEstimations.length + 1) }]

                if (parseInt(block) === 6) setTxFeePerB(Math.ceil(feeEst))
            }

            if (txFeeEstimations.length === 3) {
                //Initial Tx Fee estimations set
                setTxFees(txFeeEstimations)
            }
            }
        })
        })
        return () => {isMounted = false}
    }, [dispatch]);


    const handleKeyPress = (e) => {
        if( e.key.charCodeAt(0) === 69 ){
          // Add value to txFee list
          // set Tx fee per B
          // reset customFee
          setTxFees([...txFees,
            {block: "custom", fee : txFeePerB,id: (txFees.length+1)}])
          setCustomFee(false)
          return
        }
        if( e.key.charCodeAt(0) < 48 || e.key.charCodeAt(0) > 57  ){
          e.preventDefault();
        }
    }


  const handleFeeSelection = (event) => {
    if(event.target.value === "custom"){
      setCustomFee(true)
    }
    
    else setTxFeePerB(parseInt(event.target.value))
  }
    


    return(
        <div>
        {
          !customFee ? (
          <select
            onChange={handleFeeSelection}
            value={txFeePerB}>
            {txFees.map(feeObj => {
              let fee = Math.ceil(feeObj.fee)
              //Round up fee to nearest Satoshi
              return (
              <option value = {fee} key = {feeObj.id}>
                {feeObj.block === 6  ? ("Low "):
                  (feeObj.block === 3 ? ("Med "):
                  (feeObj.block === 1 ? ("High ") : (null)))}
                {fee} sat/B
              </option>)
            })}
            <option value={"custom"}>Custom...</option>
          </select>
          )
          :
          (
            <input 
              placeholder = "Enter value..." 
              type = "text" 
              onKeyPress={handleKeyPress}
              onChange={handleFeeSelection}/>
          )
        }

          <span className="small">Transaction Fee</span>
      </div>
    )
}

export default TransactionFee;