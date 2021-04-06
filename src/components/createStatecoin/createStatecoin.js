import React, {useState, useEffect} from 'react';

import {callGetCoinsInfo} from '../../features/WalletDataSlice'
import ValueSelectionPanel from "./valueSelection/valueSelection";
import { fromSatoshi } from '../../wallet/util'

import plus from "../../images/plus-deposit.png";
import '../../containers/Deposit/Deposit.css';

const DEFAULT_LIQUIDITY_VALUES = [{value: 100,liquidity:0},{value:500,liquidity:0},{value: 1000,liquidity:0},{value:5000,liquidity:0},{value:10000,liquidity:0},{value:50000,liquidity:0},{value:100000,liquidity:0},{value:500000,liquidity:0},{value:1000000,liquidity:0},{value:5000000,liquidity:0},{value:10000000,liquidity:0},{value:50000000,liquidity:0}]
const LIQUIDITY_MED=10;
const LIQUIDITY_HIGH=20;
const NUM_HIGH_LIQUIDITY=3;

const CreateStatecoin = (props) => {

    const [state, setState] = useState(0);
    const [liquidityData, setLiquidityData] = useState(DEFAULT_LIQUIDITY_VALUES);

    const createCoinButtonAction = () => {
      props.addSelectionPanel()
      state ? setState(0) : setState(1); // update state to re-render
    }

    useEffect(() => {
      // Get coin liquidity data
      callGetCoinsInfo().then((liquidity_data_raw) => {
        // Update liquidity data state
        let liquidity_data = Object.entries(liquidity_data_raw.values).map(([amount, liquidity]) => {
          return {value: parseInt(amount), liquidity: liquidity}
        })

        // Add list of defualt values if not already in list
        let liquidity_data_amounts = liquidity_data.map((item) => item.value);
        let defaults_missing = DEFAULT_LIQUIDITY_VALUES.filter((item) => {
          // checks if default value is already in liquidity_data. If not return item.
          if (liquidity_data_amounts.indexOf(item.value)<0) return item;
        });
        liquidity_data=liquidity_data.concat(defaults_missing)

        // Sort
        if (props.settings.sort_by==="Liquidity") {
          liquidity_data.sort((a,b) => {
            return b.liquidity - a.liquidity;
          })
        } else { // sort by amount
          liquidity_data.sort((a,b) => {
            if(props.settings.sort_by === "HighToLow") {
              return b.value - a.value;
            }
            return a.value - b.value;
          })
        }

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

        // Filter by min
        liquidity_data = liquidity_data.filter(item => fromSatoshi(item.value) >= props.settings.min_value)
        // truncate to display top {settings.picks} choices
        liquidity_data = liquidity_data.slice(0, props.settings.picks)

        setLiquidityData(liquidity_data)
      });
    }, [props.settings]);

    const populateWithSelectionPanels = props.selectedValues.map((item, index) => (
        <div key={index}>
          <div>
            <ValueSelectionPanel
              id={index}
              selectedValue={item.value}
              addValueSelection={props.addValueSelection}
              coinsLiquidityData={liquidityData}/>
          </div>
        </div>
      ));

    return (
        <div>
          {populateWithSelectionPanels}
            <div className="Body">
              <span className={"create-title"} onClick={createCoinButtonAction}>
                  <img src={plus} alt="plus"/>
                  CREATE ANOTHER STATECOIN
              </span>
            </div>
        </div>
    )
}

export default CreateStatecoin;
