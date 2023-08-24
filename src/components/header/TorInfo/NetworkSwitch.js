import { NETWORK_TYPE } from "../../../wallet/wallet";
import './NetworkSwitch.css';

export const NetworkSwitch = (props) => (
  <div
    className={
      "network-switch " + (props.newWallet ? "white-bg" : "primary-bg")
    }
  >
    <button onClick={props.onClick}>
      <span
        className={
          "network-switch-btn " +
          (props.networkType === NETWORK_TYPE.TOR ? "white" : "grey")
        }
      >
        {"TOR"}
      </span>
      <span>{" / "}</span>
      <span
        className={
          "network-switch-btn " +
          (props.networkType === NETWORK_TYPE.I2P ? "white" : "grey")
        }
      >
        {"I2P"}
      </span>
    </button>
  </div>
);
