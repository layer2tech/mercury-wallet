import React, {useState} from 'react';

import { fromSatoshi } from '../../../wallet/util'

import '../../../containers/Deposit/Deposit.css';

const DEFUALT_LIQUIDITY_VALUES = {values: {1000:5, 5000:10, 10000:40, 50000:1, 100000:0, 250000:0, 500000:0, 1000000:0}}
const LIQUIDITY_MED=10;
const LIQUIDITY_HIGH=20;
const NUM_HIGH_LIQUIDITY=3;

const ValueSelectionPanel = (props) => {

    const [selected, setSelected] = useState(props.selectedValue);

    const selectValue = (value) => {
      if (value !== selected) {
        setSelected(value);
        props.addValueSelection(props.id, value)
        return
      }
      setSelected(null);
      props.addValueSelection(props.id, null)
    }


    const populateValueSelections = () => {
      // let liquidity_data = props.coinsLiquidityData ? Array.from(props.coinsLiquidityData.entries()) : new Array();
      let liquidity_data = Object.entries(DEFUALT_LIQUIDITY_VALUES.values).map(([amount, liquidity]) => {
        return {value: parseInt(amount), liquidity: liquidity}
      });
      console.log("liquidity_data: ", liquidity_data)

      // Sort by liquidity
      liquidity_data.sort((a,b) => {
        return b.liquidity - a.liquidity;
      })
      console.log("liquidity_data: ", liquidity_data)

      // Replace liquidity value with string "None", "Low", "Med" or "High"
      let num_highs=0;
      liquidity_data.map((item) => {
        if (!item.liquidity) {item.liquidity="None"}
        else if (item.liquidity<LIQUIDITY_MED) {item.liquidity="Low"}
        else if (item.liquidity<LIQUIDITY_HIGH) {item.liquidity="Med"}
        else {
          if (num_highs<NUM_HIGH_LIQUIDITY) { // Only allow top 3 values to have "high" liquidity
            item.liquidity="High";
            num_highs+=1;
          }
          item.liquidity="Med";
        };
        return item;
      })

      console.log("liquidity_data: ", liquidity_data)
      return liquidity_data.map((item, index) => {
        return (
          <div key={index} className="numbers-item">
            <ValueSelection
              value={item.value}
              liquidity={item.liquidity}
              selected={selected}
              selectValue={selectValue}/>
          </div>
        )
      })
    }

    return (
      <div className="Body">
          <div className="deposit-main">
              <span>Select Statecoin Value</span>
              <div className="deposit-statecoins">
                <div className="numbers">
                    {populateValueSelections()}
                  </div>
              </div>
          </div>
      </div>
    )
}

const ValueSelection = (props) => {
    // Check if coin is selected. If so return CSS.
    const isSelectedStyle = () => {
      return props.value === props.selected ? {backgroundColor: "#e6e6e6"} : {}}

    return (
      <div
        onClick={() => props.selectValue(props.value)}
        style={isSelectedStyle()}>
          <span><b>{fromSatoshi(props.value)}</b> BTC</span>
          <span>Liquidity: <b>{props.liquidity}</b></span>
      </div>
    )
}

export default ValueSelectionPanel;
