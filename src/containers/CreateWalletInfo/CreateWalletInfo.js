"use strict";
import key from "../../images/key-blue-img.png";
import restore from "../../images/restore-red-img.png";
import secure from "../../images/secure-blue-img.png";
import store_img from "../../images/store-red-img.png";
import { useEffect, useState } from "react";
import { Link, withRouter } from "react-router-dom";
import "./CreateWalletInfo.css";
import check from "../../images/icon-action-check_circle.png";
import {
  callGetArgsHasTestnet,
  callSetArgsHasTestnet,
} from "../../features/WalletDataSlice";

const CreateWalletInfoPage = () => {
  const state = useState(false);
  const checked = state[0];
  const changeCheckbox = state[1];
  const [testnet, setTestnet] = useState(false);

  const networkState = useState(1);
  const networkChecked = networkState[0];
  const changeNetwork = networkState[1];

  useEffect(() => {
    callSetArgsHasTestnet(false);
  }, []);

  const selectNetwork = (mode) => {
    changeNetwork(mode);
    setTestnet(mode === 1 ? false : true);
    callSetArgsHasTestnet(mode === 1 ? false : true);
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

      {testnet === true && (
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
