import React from "react";
import reducers from "../../reducers";
import { render } from "./test-utils";
import { screen } from "@testing-library/dom";
import SwapStatus from "../../components/coins/SwapStatus/SwapStatus";
import { coinSort } from "../../components/coins/CoinsList";
import { configureStore } from "@reduxjs/toolkit";
import { makeDummyStatecoins } from "./test_data.js";

let cloneDeep = require("lodash.clonedeep");

// Ignore and do not import webStore
jest.mock("../../application/webStore", () => jest.fn());

describe("SwapStatus", function () {
  let store = configureStore({ reducer: reducers });

  test("Error Messaging", function () {
    render(store, <SwapStatus swap_error={{ msg: "not found in swap" }} />);

    expect(screen.getAllByText(/awaiting timeout/i)).toBeTruthy();

    render(
      store,
      <SwapStatus
        swap_error={{ msg: "In punishment list: Seconds remaining: 90" }}
      />
    );

    expect(screen.getAllByText(/1 mins/i)).toBeTruthy();
  });
  test("throw unexpected values in props", function () {
    render(store, <SwapStatus swap_error={12345} />);
    render(store, <SwapStatus swap_error={true} />);
  });
});

describe("CoinsList", function () {
  describe("SortCoin", function () {
    const coins_list_init = makeDummyStatecoins();
    let coins_list;
    beforeEach(() => {
      coins_list = cloneDeep(coins_list_init);
    });

    test("test sort coins by value", function () {
      const order_expected = [4, 3, 0, 2, 1];
      let sortBy = {
        direction: 0,
        by: "value",
      };
      coins_list.sort(coinSort(sortBy));
      let order = [];
      for (let i = 0; i < coins_list.length; i++) {
        order.push(
          coins_list_init.findIndex((item) => {
            let result = item.shared_key_id === coins_list[i].shared_key_id;
            return result;
          })
        );
      }
      expect(order).toEqual(order_expected);
    });

    test("test sort coins by value for swap condition", function () {
      const order_expected = [4, 3, 2, 0, 1];
      let sortBy = {
        direction: 0,
        by: "value",
        condition: "swap",
      };
      coins_list.sort(coinSort(sortBy));
      let order = [];
      for (let i = 0; i < coins_list.length; i++) {
        order.push(
          coins_list_init.findIndex((item) => {
            let result = item.shared_key_id === coins_list[i].shared_key_id;
            return result;
          })
        );
      }
      expect(order).toEqual(order_expected);
    });
  });
});
