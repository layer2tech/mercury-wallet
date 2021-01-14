import plus from "../../../images/plus-deposit.png";

import React, {useState} from 'react';

import '../../../containers/Deposit/Deposit.css';

const ValueSelectionPanel = (props) => {

    const [selected, setSelected] = useState(null);

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
                        value={0.001} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={0.005} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={0.01} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={0.05} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={0.1} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={0.25} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={0.5} selected={selected} selectValue={selectValue} />
                      <ValueSelection
                        value={1} selected={selected} selectValue={selectValue} />
                  </div>
              </div>
          </div>
      </div>
    )
}

const ValueSelection = (props) => {
    // Check if coin is selected. If so return CSS.
    const isSelectedStyle = () => {return props.value === props.selected ? {backgroundColor: "#e6e6e6"} : {}}

    return (
      <div
        className="numbers-item"
        onClick={() => props.selectValue(props.value)}
        style={isSelectedStyle()}>
          <span><b>{props.value}</b> BTC</span>
          <span>Liquidity: <b>High</b></span>
      </div>
    )
}

export default ValueSelectionPanel;
