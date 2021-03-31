import plus from "../../images/plus-deposit.png";

import React, {useState} from 'react';

import {callGetCoinsInfo} from '../../features/WalletDataSlice'
import ValueSelectionPanel from "./valueSelection/valueSelection";

import '../../containers/Deposit/Deposit.css';

const CreateStatecoin = (props) => {

    const [state, setState] = useState(0);

    const createCoinButtonAction = () => {
      props.addSelectionPanel()
      state ? setState(0) : setState(1); // update state to re-render
    }

    // Get coin liquidity data
    let coins_liquidity_data = [];
    callGetCoinsInfo().then((item) => {
      console.log("item: ", item)
      coins_liquidity_data=item
      // coins_liquidity_data={values: {1000:0}}
    });

    const populateWithSelectionPanels = props.selectedValues.map((item, index) => (
        <div key={index}>
          <div>
            <ValueSelectionPanel
              id={index}
              selectedValue={item.value}
              addValueSelection={props.addValueSelection}
              coinsLiquidityData={coins_liquidity_data}/>
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
