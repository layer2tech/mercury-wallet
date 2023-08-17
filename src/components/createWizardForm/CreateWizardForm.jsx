"use strict";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg";
import CloseIcon from "../../images/close-icon.png";
import TermsConditions from "../TermsConditions/TermsConditions";
import "./CreateWizardForm.css";
import { NETWORK_TYPE } from "../../wallet/wallet";
import { setNetworkType } from "../../features/WalletDataSlice";
import { NetworkSwitch }  from "../Header/TorInfo/NetworkSwitch";

const CreateWizardForm = (props) => {
  const { register, errors, watch, handleSubmit } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const [showPass, setShowPass] = useState(false);
  const [toggleTCs, setToggleTCs] = useState(false);
  const [walletNameError, setNameError] = useState(false);
  const [routeNetwork, setRouteNetwork] = useState(NETWORK_TYPE.TOR);

  const password = useRef({});
  password.current = watch("password", "");
  const toggleShowPass = () => setShowPass(!showPass);

  const onSubmit = (data) => {
    props.onSubmit();
  };

  //Open/Close Terms and Conditions
  const handleTCs = (e) => {
    e.preventDefault();

    let target =
      e.target.parentNode.parentNode.parentNode.parentNode.parentNode;
    //Check if the page is createWallet or restoreWallet
    if (target.classList[0] === "restore-form") {
      if (toggleTCs === false) {
        target.style.width = "100%";
        //adjust styling
      } else {
        target.style.width = "50%";
      }
    }

    setToggleTCs(!toggleTCs);
  };

  const handleKeyPress = (e) => {
    if (e.key.charCodeAt(0) === 46 || e.key.charCodeAt(0) === 47) {
      e.preventDefault();
      setNameError(true);
    } else {
      setNameError(false);
    }
  };

  const routeNetworkSwitch = () => {
    let networkType = '';
    if (routeNetwork === NETWORK_TYPE.TOR) {
      networkType = NETWORK_TYPE.I2P;
    } else {
      networkType = NETWORK_TYPE.TOR;
    }
    props.setStateWalletNetwork(networkType);
    setRouteNetwork(networkType);
    setNetworkType(networkType);
  }

  useEffect(() => {
    props.setStateWalletNetwork(NETWORK_TYPE.TOR);
  }, []);

  return (
    <div className="wizard-form">
      <form onSubmit={handleSubmit(onSubmit)}>
        {props.setStateMnemonic && (
          <div className="inputs-item">
            <input
              data-cy="mnemonic"
              id="Mnemonic"
              type="text"
              name="Mnemonic"
              placeholder="Mnemonic"
              title="12 space separated words in order"
              value={props.wizardState.mnemonic}
              onChange={props.setStateMnemonic}
              required
            />
          </div>
        )}
        {props.setStateGapLimit && (
          <div>
            <div className="inputs-item">
              <p>
                Enter the number of derived addresses to query. This is the
                highest address index previously used.
              </p>
            </div>
            <div className="inputs-item">
              <input
                data-cy="address-gap-limit"
                id="GapLimit"
                type="text"
                name="Address gap limit"
                placeholder="Address gap limit"
                title="If not known start with 1000 and increase if not all expected coins are recovered."
                value={props.wizardState.gap_limit}
                onChange={props.setStateGapLimit}
                onKeyPress={handleKeyPress}
                required
              />
            </div>
          </div>
        )}
        <div className="inputs-item">
          <input
            data-cy="cwf-wallet-name-input"
            id="Name"
            type="text"
            name="Wallet Name"
            placeholder="Wallet Name"
            title="Choose a new wallet name"
            value={props.wizardState.wallet_name}
            onChange={props.setStateWalletName}
            onKeyPress={handleKeyPress}
            required
          />
        </div>
        <div className="error">
          {walletNameError && (
            <p>
              Certain special characters are not permitted for use in Wallet
              Name
            </p>
          )}
        </div>
        <div className="inputs-item">
          <p>Enter a password for your wallet. Leave blank for no password.</p>
        </div>

        <div className="inputs-item">
          <input
            data-cy="cwf-wallet-password-input"
            id="Passphrase"
            type={showPass ? "text" : "password"}
            name="password"
            placeholder="Password (min 8 characters)"
            onChange={props.setStateWalletPassword}
            ref={register({
              minLength: {
                value: 8,
                message: "Password must have at least 8 characters",
              },
            })}
          />
          <span className={"eye-icon"} onClick={toggleShowPass}>
            {showPass ? (
              <img alt="eyeIconOff" src={eyeIconOff} />
            ) : (
              <img alt="eyeIcon" src={eyeIcon} />
            )}
          </span>
        </div>
        <div className="error">
          {errors.password && <p>{errors.password.message}</p>}
        </div>

        <div className="inputs-item">
          <input
            data-cy="cwf-wallet-password-repeat-input"
            id="password_repeat"
            type={showPass ? "text" : "password"}
            name="password_repeat"
            placeholder="Confirm Password"
            ref={register({
              validate: (value) =>
                value === password.current || "The passwords do not match",
            })}
          />
          <span className={"eye-icon"} onClick={toggleShowPass}>
            {showPass ? (
              <img alt="eyeIconOff" src={eyeIconOff} />
            ) : (
              <img alt="eyeIcon" src={eyeIcon} />
            )}
          </span>
        </div>
        <div className="error">
          {errors.password_repeat && (
            <p data-cy="recovery-error">{errors.password_repeat.message}</p>
          )}
        </div>

        <div className="inputs-item">
          <p>Select routing network type the wallet should be restored with (By default Tor):</p>
        </div>
        <div className="inputs-item network-switch-new-wallet restore-network">
          <NetworkSwitch 
            newWallet={true}
            networkType={routeNetwork}
            onClick={routeNetworkSwitch}
          />
        </div>
        <div className="inputs-item checkbox">
          <input
            data-cy="cwf-wallet-agreement-input"
            id="terms"
            type="checkbox"
            name="terms"
            required
          />

          <label htmlFor="terms">
            I have read and agree to the{" "}
            <a href="/#" className="tc-link" onClick={handleTCs}>
              Terms of Use
            </a>
          </label>
        </div>
        {toggleTCs === true ? (
          <div>
            <div onClick={handleTCs} className="tc-overlay"></div>
            <div className="terms-conditions">
              <div className="group-btns tcs">
                <button className="primary-btn ghost" onClick={handleTCs}>
                  <img src={CloseIcon} alt="close-icon" />
                </button>
              </div>
              <TermsConditions />
            </div>
          </div>
        ) : null}
        <div className="footer-step-btns">
          <Link to="/" className="primary-btn-link back">
            Go Back
          </Link>
          <button
            data-cy="cwf-wallet-create-btn"
            type="submit"
            className="primary-btn blue"
          >
            {props.submitTitle || "Next"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateWizardForm;
