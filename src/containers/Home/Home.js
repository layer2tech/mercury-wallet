"use strict";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { withRouter, Redirect } from "react-router-dom";

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

const HomePage = (props) => {
  const dispatch = useDispatch();
  const { fee_info, currentWallet, lightningLoaded } = useSelector(
    (state) => state.walletData
  );

  useEffect(() => {
    dispatch(setWalletLoaded({ loaded: true }));

    const initializeWallet = async () => {
      dispatch(setLightningLoaded({ loaded: true }));
      await startLightningLDK(currentWallet);
    };

    if (!lightningLoaded) {
      initializeWallet();
    }
  }, [dispatch, currentWallet, lightningLoaded]);

  const initWalletInRedux = async () => {
    try {
      const feeInfo = await callGetFeeInfo();
      dispatch(updateFeeInfo(feeInfo));
    } catch (err) {
      handleErrors(err);
    }
  };

  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

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
      <PanelConnectivity online={props.online} networkType={props.networkType} />
      <PanelCoinsActivity />
      {current_config?.tutorials && <Tutorial />}
    </div>
  );
};

export default withRouter(HomePage);
