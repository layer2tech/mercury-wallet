"use strict";
import key from "../../assets/images/key-blue-img.png";
import restore from "../../assets/images/restore-red-img.png";
import secure from "../../assets/images/secure-blue-img.png";
import store_img from "../../assets/images/store-red-img.png";
import { useEffect, useState } from "react";
import { Link, withRouter } from "react-router-dom";
import "./CreateWalletInfo.css";
import check from "../../assets/images/icon-action-check_circle.png";
import {
  callSetArgsHasTestnet,
  setNetwork,
} from "../../features/WalletDataSlice";
import { useDispatch } from "react-redux";
import * as bitcoin from "bitcoinjs-lib";

const CreateWalletInfoPage = () => {
  const dispatch = useDispatch();

  // check box values
  const state = useState(false);
  const checked = state[0];
  const changeCheckbox = state[1];

  // network values
  const [networkChecked, setNetworkChecked] = useState(0);

  useEffect(() => {
    callSetArgsHasTestnet(false);
    selectNetwork(0);
  }, []);

  const selectNetwork = (mode) => {
    let reduxNetworkValue = {};
    switch (mode) {
      case 0:
        reduxNetworkValue = {
          mode: 0,
          network: bitcoin.networks["testnet"],
        };
        break;
      case 1:
        reduxNetworkValue = {
          mode: 1,
          network: bitcoin.networks["bitcoin"],
        };
        break;
      case 2:
        reduxNetworkValue = {
          mode: 2,
          network: bitcoin.networks["regtest"],
        };
        break;
      default:
        reduxNetworkValue = {
          mode: 0,
          network: bitcoin.networks["testnet"],
        };
        break;
    }

    setNetworkChecked(mode);
    dispatch(setNetwork(reduxNetworkValue)); // save to redux state
    console.log("changing to network:", mode);
  };

  // Change handlers
  return (
    <div className="welcome-second">
      <h1 data-cy="create-new-wallet-title">Create a New Wallet</h1>

      <div className="network-btns">
        <div
          data-cy="network-btn-testnet"
          onClick={() => selectNetwork(0)}
          className={`${networkChecked === 0 ? "selected" : ""}`}
        >
          <span>Testnet</span>
          <img className="check-img" src={check} alt="plus" />
        </div>
        <div
          data-cy="network-btn-mainnet"
          onClick={() => selectNetwork(1)}
          className={`${networkChecked === 1 ? "selected" : ""}`}
        >
          <span>Mainnet</span>
          <img className="check-img" src={check} alt="plus" />
        </div>
        <div
          data-cy="network-btn-regtest"
          onClick={() => selectNetwork(2)}
          className={`${networkChecked === 2 ? "selected" : ""}`}
        >
          <span>Regtest</span>
          <img className="check-img" src={check} alt="plus" />
        </div>
      </div>

      {networkChecked === 0 && (
        <b>
          <p data-cy="create-new-wallet-important" className="red">
            IMPORTANT: Wallet was opened in testnet, therefore new wallets will
            be created in testnet. Existing wallets are not changed.
          </p>
        </b>
      )}
      <div className="create-welcome">
        <div className="create-welcome-item">
          <img src={secure} alt="secure" />
          <p>
            The 12 word seed key shown in the next view provides access to your
            wallet. Copy and store it somewhere safe.
          </p>
        </div>
        <div className="create-welcome-item">
          <img src={store_img} alt="store" />
          <p>Never store it online or on the same computer as the wallet.</p>
        </div>
        <div className="create-welcome-item">
          <img src={key} alt="key" />
          <p>
            The seed key is the only way to recover your wallet if your computer
            is lost, stolen or stops working.{" "}
          </p>
        </div>
        <div className="create-welcome-item">
          <img src={restore} alt="restore" />
          <p>There is no way to recover the seed if lost.</p>
        </div>
      </div>
      <div className="inputs-item">
        <input
          data-cy="c-n-w-checkbox"
          id="checkbox"
          type="checkbox"
          name="checkbox"
          required
          onChange={() => changeCheckbox(!checked)}
        />
        <label
          data-cy="create-new-wallet-agreement-txt"
          className="control-label"
          htmlFor="checkbox"
        >
          {" "}
          I confirm that nobody can see my screen and take responsiblity of the
          security of this computer, because anyone who has access to my seed
          key will be able to spend the funds in my wallet.
        </label>
      </div>
      <div className="footer-step-btns">
        <Link
          data-cy="c-n-w-go-back-btn"
          className="primary-btn-link back"
          to="/"
        >
          go back
        </Link>
        <Link
          data-cy="c-n-w-continue-btn"
          to="/create_wizard"
          className={`primary-btn blue  ${!checked ? "disabled" : ""}`}
        >
          Continue
        </Link>
      </div>
    </div>
  );
};

export default withRouter(CreateWalletInfoPage);