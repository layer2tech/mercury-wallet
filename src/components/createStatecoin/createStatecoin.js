"use strict";
import "../../containers/Deposit/Deposit.css";
import React, { useState, useEffect } from "react";
import Spinner from "react-bootstrap/Spinner";
import plus from "../../images/plus-deposit.png";
import {
  callGetCoinsInfo,
  callGetFeeInfo,
  updateFeeInfo,
} from "../../features/WalletDataSlice";
import ValueSelectionPanel from "./valueSelection/valueSelection";
import { FEE, fromSatoshi } from "../../wallet/util";
import { useSelector, useDispatch } from "react-redux";

const DEFAULT_LIQUIDITY_VALUES = [
  { value: 100000, liquidity: 0 },
  { value: 1000000, liquidity: 0 },
  { value: 10000000, liquidity: 0 },
  { value: 100000000, liquidity: 0 },
  { value: 5000000, liquidity: 0 },
  { value: 50000000, liquidity: 0 },
];
const LIQUIDITY_MED = 10;
const LIQUIDITY_HIGH = 20;
const NUM_HIGH_LIQUIDITY = 3;

const CreateStatecoin = (props) => {
  const [state, setState] = useState(0);
  const [liquidityData, setLiquidityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState({ error: false, message: "" });

  const dispatch = useDispatch();
  let fee_info = useSelector((state) => state.walletData).fee_info;

  const [withdrawFee, setWithdrawFee] = useState(null);

  const createCoinButtonAction = () => {
    props.addSelectionPanel();
    state ? setState(0) : setState(1); // update state to re-render
  };

  useEffect(() => {
    let isMounted = true;
    // Get coin liquidity data
    callGetCoinsInfo()
      .then((liquidity_data_raw) => {
        if (isMounted === true) {
          // Update liquidity data state

          let liquidity_data = [];
          //get most liquid coin amounts
          Object.entries(liquidity_data_raw.values).map(
            ([amount, liquidity]) => {
              let coin_value = parseInt(amount);
              if (coin_value >= 100000) {
                // Only display coin values over dust limit
                if (
                  liquidity >= 3 ||
                  Math.round(coin_value / 100000) === coin_value / 100000
                ) {
                  // this condition removes accidental strange deposit values
                  liquidity_data.push({
                    value: parseInt(amount),
                    liquidity: liquidity,
                  });
                }
              }
            }
          );

          // Add list of defualt values if not already in list
          let liquidity_data_amounts = liquidity_data.map((item) => item.value);
          let defaults_missing = DEFAULT_LIQUIDITY_VALUES.filter((item) => {
            // checks if default value is already in liquidity_data. If not return item.
            if (liquidity_data_amounts.indexOf(item.value) < 0) return item;
            return null;
          });
          liquidity_data = liquidity_data.concat(defaults_missing);

          // Sort
          if (props.settings.sort_by === "Liquidity") {
            liquidity_data.sort((a, b) => {
              return b.liquidity - a.liquidity;
            });
          } else {
            // sort by amount
            liquidity_data.sort((a, b) => {
              if (props.settings.sort_by === "HighToLow") {
                return b.value - a.value;
              }
              return a.value - b.value;
            });
          }

          // Replace liquidity value with string "None", "Low", "Med" or "High"
          let num_highs = 0;
          liquidity_data.map((item) => {
            if (!item.liquidity) {
              item.liquidityLabel = "None";
            } else if (item.liquidity < LIQUIDITY_MED) {
              item.liquidityLabel = "Low";
            } else if (item.liquidity < LIQUIDITY_HIGH) {
              item.liquidityLabel = "Med";
            } else {
              if (num_highs < NUM_HIGH_LIQUIDITY) {
                // Only allow top 3 values to have "high" liquidity
                item.liquidityLabel = "High";
                num_highs += 1;
              } else {
                item.liquidityLabel = "Med";
              }
            }
            return item;
          });

          // Filter by min
          liquidity_data = liquidity_data.filter(
            (item) => fromSatoshi(item.value) >= props.settings.min_value
          );
          // truncate to display top {settings.picks} choices
          liquidity_data = liquidity_data.slice(0, props.settings.picks);

          // if it exists in the state - use it
          if (withdrawFee !== null) {
            console.log("fee already exists, so use the one from state...");
            liquidity_data = liquidity_data.filter(
              (statecoin) =>
                statecoin.value >=
                FEE + (statecoin.value * withdrawFee.withdraw) / 10000
            );
            setLiquidityData(liquidity_data);
            setLoading(false);
          }
          // else does it exist in redux?
          else if (fee_info?.withdraw) {
            console.log("fee already exists, so use the one from state...");
            liquidity_data = liquidity_data.filter(
              (statecoin) =>
                statecoin.value >=
                FEE + (statecoin.value * fee_info.withdraw) / 10000
            );
            setLiquidityData(liquidity_data);
            setLoading(false);
          }
          // try a network call to get feeInfo
          else {
            console.log("find the fee value...");
            // filter out coins where the value is not greater than the total fee
            callGetFeeInfo()
              .then((fee_info) => {
                liquidity_data = liquidity_data.filter(
                  (statecoin) =>
                    statecoin.value >=
                    FEE + (statecoin.value * fee_info.withdraw) / 10000
                );
                setWithdrawFee(fee_info);
                setLiquidityData(liquidity_data);
                setLoading(false);

                // update to redux state as well since we called it
                dispatch(updateFeeInfo(fee_info));
              })
              .catch((e) => {
                setError({
                  error: true,
                  message: "Awaiting fee info from server... retry",
                });
                props.handleChildErrors(true);
                setLoading(false);
              });
          }
        }
      })
      .catch((e) => {
        setLoading(false);
        setError({
          error: true,
          message: "Awaiting statecoin values from server... retry",
        });
        props.handleChildErrors(true);
      });

    // timeout after 25 seconds, if we are still in loading
    const timer = setTimeout(() => {
      setLoading((prevValue) => {
        if (prevValue) {
          setLoading(false);
          setError({
            error: true,
            message:
              "timed out loading statecoin values, check your connection to mercury server",
          });
        }
        return prevValue;
      });
    }, 30000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [props.settings]);

  const populateWithSelectionPanels = props.selectedValues.map(
    (item, index) => (
      <div key={index}>
        <div>
          <ValueSelectionPanel
            id={index}
            selectedValue={item.value}
            addValueSelection={props.addValueSelection}
            coinsLiquidityData={liquidityData}
          />
        </div>
      </div>
    )
  );

  const loadingStateCoins = (
    <div>
      <div>
        <Spinner animation="border" variant="primary"></Spinner>
      </div>
      <div>Loading statecoin values...</div>
      <br />
    </div>
  );

  const errorLoading = (
    <div>
      <div>
        <Spinner animation="border" variant="danger"></Spinner>
      </div>
      <br />
      <div className="custom-modal-info alert-danger">{error.message}</div>
      <br />
    </div>
  );

  const createAnotherStatecoin = (
    <div className="Body">
      <span className={"create-title"} onClick={createCoinButtonAction}>
        <img src={plus} alt="plus" />
        CREATE ANOTHER STATECOIN
      </span>
    </div>
  );

  return (
    <div>
      {error.error && errorLoading}
      {!error.error
        ? loading
          ? loadingStateCoins
          : populateWithSelectionPanels
        : null}
      {!error.error ? (!loading ? createAnotherStatecoin : null) : null}
    </div>
  );
};

export default CreateStatecoin;
