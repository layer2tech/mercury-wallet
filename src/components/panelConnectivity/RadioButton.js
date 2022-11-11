"use strict";
import { useSelector } from "react-redux";

const RadioButton = (props) => {
  const { walletMode } = useSelector((state) => state.walletData);

  return (
    <div
      data-cy="connection-radio-button"
      className={`connection-title Connection${props.connection}`}
    >
      <label>
        <input readOnly type="radio" checked={props.checked || false} />
        {props.condition === true ? "Connected" : "Connecting"} to{" "}
        {props.connection}
        <span
          className={props.condition ? "checkmark connected" : "checkmark"}
        ></span>
      </label>
    </div>
  );
};

export default RadioButton;
