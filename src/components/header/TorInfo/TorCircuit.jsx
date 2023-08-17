"use strict";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  callGetNewTorCircuit,
  callGetTorcircuitInfo,
  callUpdateTorCircuitInfo,
  setTorOnline,
  callGetConfig,
  setIntervalIfOnline,
  setWarning,
  setNetworkType,
  callUnsubscribeAll,
  callResetConnectionData,
} from "../../../features/WalletDataSlice";
import "./TorCircuit.css";
import TorCircuitNode from "./TorCircuitNode";
import { handleNetworkError } from "../../../error";
import WrappedLogger from "../../../WrappedLogger";
import { NETWORK_TYPE } from "../../../wallet/wallet";
import { defaultWalletConfig } from "../../../wallet/config";
import { Spinner } from "react-bootstrap";
import { NetworkSwitch } from "./NetworkSwitch";
import { shortenURL } from "./TorUtils";

//  Node friendly importing required for Jest tests.
let log;
log = new WrappedLogger();

const TorCircuit = (props) => {

  // config data
  let config;
  try {
    config = callGetConfig();
  } catch {
    defaultWalletConfig().then((result) => {
      config = result;
    });
  }
  const state_entity_endpoint = config?.state_entity_endpoint;

  // Load Tor data
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [torcircuitData, setTorcircuitData] = useState([]);
  const [torLoaded, setTorLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const interval = setIntervalIfOnline(
      getTorCircuitInfo,
      props.online,
      10000,
      isMounted
    );
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dispatch, props.online]);

  const getTorCircuitInfo = () => {
    console.log("TorCircuit.jsx->getTorCircuitInfo()");
    if (props.online) {
      if (props.networkType === NETWORK_TYPE.I2P) {
        // If I2P connection selected check for I2P connection
        // If callUpdateTorCircuitInfo doesn't throw error then there is connection
        dispatch(setTorOnline(true));
        return;
      } else {
        let torcircuit_data = null;
        try {
          dispatch(callUpdateTorCircuitInfo());
          torcircuit_data = callGetTorcircuitInfo();
        } catch (err) {
          handleNetworkError(err);
        }
        let torcircuit_array = torcircuit_data != null ? torcircuit_data : [];
        const loaded = torcircuit_data != null && torcircuit_data.length > 0;
        setTorLoaded(loaded);
        dispatch(setTorOnline(loaded));

        console.log('settingTorCircuitData->', torcircuit_array);
        console.log('before it was equal to:', torcircuitData);
        setTorcircuitData(torcircuit_array);
      }
    } else {
      dispatch(setTorOnline(false));
      setTorLoaded(false);
    }
  };

  const newCircuit = () => {
    setLoading(true);
    dispatch(callGetNewTorCircuit()).then(() => {
      getTorCircuitInfo();
    });
  };

  useEffect(() => {
    setLoading(false);
  }, [torcircuitData]);

  //////////////////////////////////////////////////////////////////////////////////////
  // network switch code
  //////////////////////////////////////////////////////////////////////////////////////
  const resetConnectivityData = () => {
    callResetConnectionData(dispatch);
  };

  const networkSwitchAndLogOut = async (NETWORK_TYPE) => {
    // Unsubscribe Block Height before overwriting electrs client
    await callUnsubscribeAll();
    await setNetworkType(NETWORK_TYPE);
    props.setNetworkType(NETWORK_TYPE);
    resetConnectivityData();
  };

  const setNetwork = () => {
    if (props.networkType === NETWORK_TYPE.TOR) {
      networkSwitchAndLogOut(NETWORK_TYPE.I2P);
    } else {
      networkSwitchAndLogOut(NETWORK_TYPE.TOR);
    }
  };

  const networkSwitch = () => {
    let networkChange;
    if (props.networkType === NETWORK_TYPE.TOR) {
      networkChange = NETWORK_TYPE.I2P;
    } else {
      networkChange = NETWORK_TYPE.TOR;
    }

    dispatch(
      setWarning({
        title: `Network Switch: ${props.networkType} -> ${networkChange}`,
        msg: `Before switching networks, please make sure that you do not have any active swaps. Would you like to switch networks now?`,
        onConfirm: setNetwork,
      })
    );
  };

  //////////////////////////////////////////////////////////////////////////////////////

  return (
    <div className="dropdown tor">
      <NetworkSwitch
        newWallet={false}
        networkType={props.networkType}
        onClick={networkSwitch}
      />
      {props.networkType === NETWORK_TYPE.TOR ? (
        <div className="dropdown-content">
          {loading ? (
            <div>
              <p>Generating new circuit...</p>
              <Spinner animation="border" variant="info" size="sm" />
            </div>
          ) : torLoaded ? (
            <div>
              <ul>
                <TorCircuitNode
                  class="passed"
                  name="Mercury Wallet"
                ></TorCircuitNode>
                {torcircuitData.map((circuit, index) => {
                  if (circuit.ip === "") return;
                  return (
                    <TorCircuitNode
                      className="passed"
                      name={circuit.country}
                      ip={circuit.ip}
                      key={circuit.ip}
                    ></TorCircuitNode>
                  );
                })}
                {
                  <TorCircuitNode
                    class="current"
                    name={shortenURL(state_entity_endpoint)}
                  ></TorCircuitNode>
                }
              </ul>
              <button className="Body-button transparent" onClick={newCircuit}>
                New Circuit
              </button>
            </div>
          ) : (
            <div>
              <p>Connecting to TOR </p>
              <Spinner animation="border" variant="info" size="sm" />
            </div>
          )}
        </div>
      ) : (
        <div className="dropdown-content">
          <button className="Body-button transparent">New Tunnel</button>
        </div>
      )}
    </div>
  );
};

export default TorCircuit;