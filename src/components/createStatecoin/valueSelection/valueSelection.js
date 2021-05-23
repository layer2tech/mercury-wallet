import React, {useState} from 'react';

import { fromSatoshi } from '../../../wallet/util'

import '../../../containers/Deposit/Deposit.css';

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

    const populateValueSelections = props.coinsLiquidityData.map((item, index) => {
        return (
          <div key={index} className="numbers-item">
            <ValueSelection
              value={item.value}
              liquidity={item.liquidity}
              liquidityLabel={item.liquidityLabel}
              selected={selected}
              selectValue={selectValue}/>
          </div>
        )
      });

    return (
      <div className="Body">
          <div className="deposit-main">
              <span>Select Statecoin Value</span>
              <div className="deposit-statecoins">
                <div className="numbers">
                    {populateValueSelections}
                  </div>
              </div>
          </div>
      </div>
    )
}

const ValueSelection = (props) => {

    return (
      <div
        className={`${props.value === props.selected ? 'selected-value' : ''}`}
        onClick={() => props.selectValue(props.value)}
      >
          <span><b>{fromSatoshi(props.value)}</b> BTC</span>
          <span>Liquidity: <b>{props.liquidityLabel}</b></span>
      </div>
    )
}

export default ValueSelectionPanel;
