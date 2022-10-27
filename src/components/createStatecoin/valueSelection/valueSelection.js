import React, { useState, useRef, useEffect } from "react";
import { Modal } from "react-bootstrap";
import {
  MINIMUM_DEPOSIT_SATOSHI,
  fromSatoshi,
  toSatoshi,
} from "../../../wallet/util";
import "../../../containers/Deposit/Deposit.css";
import { callGetFeeInfo } from "../../../features/WalletDataSlice";
import { handleErrors } from "../../../error";
import { useSelector } from "react-redux";
import WrappedLogger from "../../../wrapped_logger";

// Logger import.
// Node friendly importing required for Jest tests.
let log;
log = new WrappedLogger();

const ValueSelectionPanel = (props) => {
  const customInputRef = useRef();
  const firstRender = useRef(true); // used to retrieve fee value
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDeposit, setCustomDeposit] = useState({
    liquidity: 0,
    value: 0,
    liquidityLabel: "Other",
    customInput: true,
  });
  const [depositBTC, setDepositBTC] = useState({});
  const [selected, setSelected] = useState(null);
  const [withdrawFee, setWithdrawFee] = useState(0);
  const [disable, setDisabled] = useState(true); // used on being able to submit a value in modal
  const [depositError, setDepositError] = useState(null); // error messages to display to the user

  let fee_info = useSelector((state) => state.walletData).fee_info;

  const selectValue = (value) => {
    if (value !== selected) {
      setSelected(value);
      props.addValueSelection(props.id, value);
      return;
    }
    setSelected(null);
    props.addValueSelection(props.id, null);
  };

  let coinsLiquidityData = props.coinsLiquidityData; //.slice(0, props.coinsLiquidityData.length -1);
  if (customDeposit.value) {
    coinsLiquidityData = [...coinsLiquidityData, customDeposit];
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      // set the fee value if we don't have it already
      if (!fee_info?.withdraw) {
        callGetFeeInfo()
          .then((fee) => {
            setWithdrawFee(fee?.withdraw);
          })
          .catch((err) => {
            handleErrors(err);
          });
      }

      return;
    }

    const validateModal = () => {
      // convert fee and depositBTC to satoshi value
      let depositBTCSatoshi = toSatoshi(depositBTC);
      let errorMsg = "";

      if (depositBTC === "") {
        errorMsg = "value cannot be empty.";
      } else if (depositBTC === 0) {
        errorMsg = "value cannot be 0.";
      } else if (depositBTC < 0) {
        errorMsg = "value cannot be negative.";
      } else if (depositBTCSatoshi < MINIMUM_DEPOSIT_SATOSHI) {
        errorMsg = `Not enough value to cover fee: ${fromSatoshi(
          MINIMUM_DEPOSIT_SATOSHI
        )} BTC`;
      } else if (
        equalToArrayValue(depositBTCSatoshi, props.coinsLiquidityData)
      ) {
        errorMsg = "You can already select this value";
      } else {
        setDepositError(null);
        return false;
      }
      setDepositError(errorMsg);
      return true;
    };

    // validate
    setDisabled(validateModal());
  }, [depositBTC, withdrawFee, props.coinsLiquidityData]); // Only re-run the effect if these change

  const equalToArrayValue = (value, arr) => {
    for (var i = 0; i < arr.length; i++) {
      if (value === arr[i].value) return true;
    }
    return false;
  };

  const handleClose = () => setShowCustomInput(false);
  const handleConfirm = () => {
    const customValue = toSatoshi(customInputRef.current.value);
    setCustomDeposit({
      ...customDeposit,
      value: customValue,
    });
    selectValue(customValue);
    setShowCustomInput(false);
  };

  const populateValueSelections = coinsLiquidityData.map((item, index) => {
    return (
      <div
        key={index}
        className={`numbers-item ${
          selected === item.value ? "selected-value" : ""
        }`}
      >
        {selected === item.value && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 14C4.69159 14 2 11.3084 2 8C2 4.69159 4.69159 2 8 2C11.3084 2 14 4.69159 14 8C14 11.3084 11.3084 14 8 14ZM4.64603 7.15381L4.64602 7.15382L3.79984 8.00001L6.80011 11.0003L12.2002 5.60023L11.354 4.7481L6.8001 9.30197L4.64602 7.15383L4.64603 7.15381Z"
              fill="var(--primary)"
            />
          </svg>
        )}
        <ValueSelection
          value={item.value}
          liquidity={item.liquidity}
          liquidityLabel={item.liquidityLabel}
          selected={selected}
          selectValue={selectValue}
        />
      </div>
    );
  });

  return (
    <div className="Body">
      <div className="deposit-main">
        <span>Select Statecoin Value</span>
        <div className="deposit-statecoins">
          <div data-cy="deposit-statecoins-numbers" className="numbers">
            {populateValueSelections}
            {customDeposit.value === 0 && (
              <div
                data-cy="deposit-statecoin-other"
                className="numbers-item"
                onClick={() => setShowCustomInput(true)}
              >
                <span className="custom-deposit-btn">
                  <b>Other</b>
                </span>
                <div className="progress">
                  <div className="fill" style={{ width: "0%" }}></div>
                </div>
                <span color="var(--text-secondary)">Select Value</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal show={showCustomInput} onHide={handleClose} className="modal">
        <Modal.Body className="custom-modal-body">
          <div className="selected-item">
            <span>Custom Value</span>
            <input
              data-cy="deposit-custom-input"
              name="depositBtc"
              type="number"
              className="custom-smallest"
              ref={customInputRef}
              value={depositBTC}
              onChange={(e) => setDepositBTC(e.target.value)}
              required
            />
            {depositError && (
              <p className="custom-modal-info alert-danger"> {depositError} </p>
            )}
          </div>
        </Modal.Body>
        <div className="custom-modal-footer group-btns">
          <button className="Body-button transparent" onClick={handleClose}>
            Cancel
          </button>
          <button
            data-cy="deposit-custom-confirm-btn"
            className={`Body-button ${disable ? "grey" : "blue"}`}
            onClick={handleConfirm}
            disabled={disable}
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
};

const getPercentByLabel = (label) => {
  switch (label) {
    case "Low":
      return 33;
    case "Med":
      return 66;
    case "High":
      return 100;
    default:
      return 0;
  }
};

const ValueSelection = (props) => {
  return (
    <div onClick={() => props.selectValue(props.value)}>
      <span>
        <b>{fromSatoshi(props.value)}</b> BTC
      </span>
      <div className="progress">
        <div
          className={`fill`}
          style={{ width: `${getPercentByLabel(props.liquidityLabel)}%` }}
        ></div>
      </div>
      <span>
        Liquidity: <b>{props.liquidityLabel}</b>
      </span>
    </div>
  );
};

export default ValueSelectionPanel;
