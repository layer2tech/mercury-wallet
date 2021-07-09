import '../../containers/Deposit/Deposit.css';
import React, {useState, useEffect} from 'react';
import Spinner from 'react-bootstrap/Spinner';
import plus from "../../images/plus-deposit.png";
import {callGetFeeInfo} from '../../features/WalletDataSlice';
import ValueSelectionPanel from "./valueSelection/valueSelection";
import { FEE, MINIMUM_DEPOSIT_SATOSHI, fromSatoshi } from '../../wallet/util';

const DEFAULT_LIQUIDITY_VALUES = [{value:200000, liquidity:0},{value:500000,liquidity:0},{value:1000000,liquidity:0},{value:5000000,liquidity:0},{value:10000000,liquidity:0},{value:50000000,liquidity:0}]
const LIQUIDITY_MED=10;
const LIQUIDITY_HIGH=20;
const NUM_HIGH_LIQUIDITY=3;

const CreateStatecoin = (props) => {

    const [state, setState] = useState(0);
    const [liquidityData, setLiquidityData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState({error: false, message:""});

    const createCoinButtonAction = () => {
      props.addSelectionPanel()
      state ? setState(0) : setState(1); // update state to re-render
    }

    useEffect(() => {
      // Update liquidity data state
      let liquidity_data = Object.entries(DEFAULT_LIQUIDITY_VALUES.values).map(([amount, liquidity]) => {
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
        if (!item.liquidity) {item.liquidityLabel="None"}
        else if (item.liquidity<LIQUIDITY_MED) {item.liquidityLabel="Low"}
        else if (item.liquidity<LIQUIDITY_HIGH) {item.liquidityLabel="Med"}
        else {
          if (num_highs<NUM_HIGH_LIQUIDITY) { // Only allow top 3 values to have "high" liquidity
            item.liquidityLabel="High";
            num_highs+=1;
          } else {
            item.liquidityLabel="Med";
          }
        };
        return item;
      })

      // Filter by min
      liquidity_data = liquidity_data.filter(item => fromSatoshi(item.value) >= props.settings.min_value)
      // truncate to display top {settings.picks} choices
      liquidity_data = liquidity_data.slice(0, props.settings.picks)


      /* - calling the server for fee info every time we go to deposit page seems wrong -  using MINIMUM_DEPOSIT_SATOSHI value instead
      callGetFeeInfo().then(fee =>  {
        liquidity_data = liquidity_data.filter(statecoin => statecoin.value >= (FEE + ((statecoin.value * fee.withdraw) / 10000)));
        // ensure coins cannot be below 0.002 btc
        liquidity_data = liquidity_data.filter(statecoin => statecoin.value >= MINIMUM_DEPOSIT_SATOSHI);
        setLiquidityData(liquidity_data);
        setLoading(false);
      }).catch(e => {
        setError({error: true, message: 'Failed retrieving fee info from server...'});
        setLoading(false);
      });*/

      // filter out coins where the value is not greater than the total fee
      liquidity_data = liquidity_data.filter(statecoin => statecoin.value >= MINIMUM_DEPOSIT_SATOSHI);
      setLiquidityData(liquidity_data);
      setLoading(false);

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

    const loadingStateCoins =  (<div>
      <div><Spinner animation="border" variant="primary" ></Spinner></div>
      <div>Loading statecoin values...</div>
      <br/>
    </div>);

    const errorLoading = (
      <div>
        <div><Spinner animation="border" variant="danger" ></Spinner></div>
        <br/>
        <div className='custom-modal-info alert-danger'>{error.message}</div>
        <br/>
      </div>
    );

    const createAnotherStatecoin = (
      <div className="Body">
        <span className={"create-title"} onClick={createCoinButtonAction}>
            <img src={plus} alt="plus"/>
            CREATE ANOTHER STATECOIN
        </span>
      </div>
    );

    return (
        <div>
          {error.error && errorLoading}
          {!error.error && loading ?  loadingStateCoins : populateWithSelectionPanels}
          {!error.error && !loading && createAnotherStatecoin}
        </div>
    )
}

export default CreateStatecoin;
