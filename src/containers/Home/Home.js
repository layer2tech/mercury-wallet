"use strict";
import { withRouter, Redirect } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import {
  isWalletLoaded,
  updateFeeInfo,
  callGetFeeInfo,
  callGetConfig,
  setWalletLoaded,
  setLightningLoaded,
  startLightningLDK,
} from "../../features/WalletDataSlice";
import {
  PanelControl,
  PanelConnectivity,
  PanelCoinsActivity,
  Tutorial,
} from "../../components";
import { handleErrors } from "../../error";
import WrappedLogger from "../../wrapped_logger";
import { useEffect } from "react";

// Logger import.
// Node friendly importing required for Jest tests.
let log;
log = new WrappedLogger();

// Home page is the main page from which a user can view and use their Wallet.
// Provided with props Home is used to initiliase a Wallet into the Redux state.
const HomePage = (props) => {
  const dispatch = useDispatch();
  let fee_info = useSelector((state) => state.walletData).fee_info;
  let wallet = useSelector((state) => state.walletData).currentWallet;
  const isLightningLoaded = useSelector(
    (state) => state.walletData.lightningLoaded
  );

  useEffect(() => {
    dispatch(setWalletLoaded({ loaded: true }));

    const initializeWallet = async () => {
      dispatch(setLightningLoaded({ loaded: true }));
      await startLightningLDK(wallet);
    };

    if (!isLightningLoaded) {
      initializeWallet();
    }
  }, [dispatch, wallet, isLightningLoaded]);

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  // Initiliase wallet data in Redux state
  const initWalletInRedux = () => {
    // Get fee info
    fee_info = callGetFeeInfo()
      .then((fee_info) => {
        dispatch(updateFeeInfo(fee_info));
      })
      .catch((err) => {
        handleErrors(err);
      });
  };

  // Check if wallet initialised
  if (fee_info.deposit === "NA") {
    initWalletInRedux();
  }

  let current_config;
  try {
    current_config = callGetConfig();
  } catch (error) {
    console.warn("Can not get config", error);
  }
  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity
        online={props.online}
        networkType={props.networkType}
      />
      <PanelCoinsActivity />
      {current_config?.tutorials && <Tutorial />}
    </div>
  );
};

export default withRouter(HomePage);
