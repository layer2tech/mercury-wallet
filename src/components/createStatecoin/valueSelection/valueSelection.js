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

    return (
      <div className="Body">
          <div className="deposit-main">
              <span>Select Statecoin Value</span>
              <div className="deposit-statecoins">
                  <div className="numbers">
                      <ValueSelection
                        value={1000} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={5000} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={10000} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={50000} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={100000} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={250000} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={500000} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={1000000} selected={selected} selectValue={selectValue} />
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
        className="numbers-item"
        onClick={() => props.selectValue(props.value)}
        style={isSelectedStyle()}>
          <span><b>{fromSatoshi(props.value)}</b> BTC</span>
          <span>Liquidity: <b>High</b></span>
      </div>
    )
}

export default ValueSelectionPanel;
