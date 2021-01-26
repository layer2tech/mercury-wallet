import plus from "../../images/plus-deposit.png";

import React, {useState, useEffect} from 'react';

import ValueSelectionPanel from "./valueSelection/valueSelection";

import '../../containers/Deposit/Deposit.css';

const CreateStatecoin = (props) => {

    const [state, setState] = useState(0);

    const createCoinButtonAction = () => {
      props.addSelectionPanel()
      state ? setState(0) : setState(1); // update state to re-render
    }

    const populateWithSelectionPanels = props.selectedValues.map((item, index) => (
        <div key={index}>
          <div>
            <ValueSelectionPanel id={index} selectedValue={item.value} addValueSelection={props.addValueSelection}/>
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
