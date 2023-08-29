import { NETWORK_TYPE } from "../../../wallet/wallet";
import './NetworkSwitch.css';

export const NetworkSwitch = (props) => (
  <div
    className={
      "network-switch " + (props.newWallet ? "white-bg" : "primary-bg")
    }
  >
      <span
        className={
          "network-switch-btn " +
          (props.networkType === NETWORK_TYPE.TOR ? "white" : "grey")
        }
      >
        {"TOR"}
      </span>
  </div>
);
