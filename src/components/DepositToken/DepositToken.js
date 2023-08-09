import React, { useState, useEffect } from "react";
import CopiedButton from "../CopiedButton";
import QRCode from "qrcode.react";
import "./DepositToken.css";
import arrow from "../../images/arrow-up.png";
import { useDispatch, useSelector } from "react-redux";
import { fromSatoshi } from "../../wallet";
import QRCodeGenerator from "../QRCodeGenerator/QRCodeGenerator";
import {
  callDeleteToken,
  callDeleteTokenByAddress,
  callTokenDeleteAsync,
  callTokenDepositInit,
  callTokenVerify,
  callTokenVerifyValues,
  setError,
  setToken,
} from "../../features/WalletDataSlice";
import close_img from "../../images/close-icon.png";
import { DUST_LIMIT } from "../../wallet/util";
import AddressInput from "../inputs/addressInput";
import { Spinner } from "react-bootstrap";

// Add Animation for when button clicked

const DepositToken = ({
  token = "",
  confirmDelete = () => {},
  setStep,
  setLoading,
  loading,
}) => {
  const dispatch = useDispatch();
  const { fee_info, token_verify } = useSelector((state) => state.walletData);

  const [address, setAddress] = useState({ addr: token.token.ln, type: "ln" });
  const [tokenFee, setTokenFee] = useState(""); // sum of values multiplied by fee_info.deposit
  const [tokenId, setTokenId] = useState("");
  const [refresh, setRefresh] = useState();

  const [balance, setBalance] = useState();

  useEffect(() => {
    if (tokenFee === "") {
      let fee_amount =
        (token.values.reduce((partialSum, a) => partialSum + a, 0) *
          fee_info.deposit) /
        10000;

      setTokenFee(fee_amount);
    }
  }, [tokenFee]);

  const totalStatecoinCount = (valuesArray) => {
    // Returns Obj of key - statecoin amount and value - statecoin frequency
    const counts = {};

    for (const num of valuesArray) {
      counts[num] = counts[num] ? counts[num] + 1 : 1;
    }

    return counts;
  };

  const copyAddressToClipboard = (e) => {
    navigator.clipboard.writeText(address.addr);
  };

  const handleConfirm = () => {
    if (tokenId !== "") {
      // Create an array of promises for dispatching callTokenDepositInit actions
      token.values.map((item) => {
        setLoading(true);
        dispatch(callTokenDepositInit({ value: item, token: tokenId })).then(
          (value) => {
            setLoading(false);

            if ((value.type = "tokenDepositInit/fulfilled")) {
              dispatch(
                callDeleteTokenByAddress({ lnAddress: address.addr })
              ).then(() => {
                setStep(3);
              });
            } else {
              // if it failed
              dispatch(
                setError({ msg: "Coin was unable to be created, try again" })
              );
            }
          }
        );
      });
    } else if (token_verify.status === "idle") {
      setLoading(true);
      dispatch(setToken(token)).then((value) => {
        setLoading(false);
        if ((value.type = "tokenDepositInit/fulfilled")) {
          dispatch(callDeleteTokenByAddress({ lnAddress: address.addr })).then(
            () => {
              setStep(3);
            }
          );
        } else {
          dispatch(
            setError({ msg: "Coin was unable to be created, try again" })
          );
        }
      });
    }
  };

  const handleBalance = async () => {
    if (tokenId !== "") {
      console.log("tokenId is equal to:", tokenId);
      //dispatch());
      let val = await callTokenVerifyValues(tokenId);
      console.log("val is equal to:", val);
      setBalance(val.amount);
    }
  };

  return !loading ? (
    <div className="token-deposit receiveStatecoin content">
      <div className="Body">
        <div className="Body-button expired">
          <img
            className="close"
            src={close_img}
            alt="arrow"
            onClick={() => confirmDelete(token.token.id)}
          />
        </div>
        <div className="body-title">
          <span className="title">
            <h1 className="receive-note">Deposit Token</h1>
            <p>Send {fromSatoshi(tokenFee)} BTC to an address below</p>
          </span>
          <span className="token-amount">
            <h1 className="receive-note amount">{fromSatoshi(tokenFee)} BTC</h1>
          </span>
        </div>

        <div className="coin-count-display">
          {Object.entries(totalStatecoinCount(token.values)).map(
            ([key, value]) => {
              return (
                <p key={key} className="coin-count">
                  {value} x {fromSatoshi(key)} BTC
                </p>
              );
            }
          )}
        </div>

        <div className="receiveStatecoin-scan">
          <div className="receive-qr-code">
            <QRCode value={address.addr.toUpperCase()} />
          </div>
          <div className="receiveStatecoin-scan-content">
            <div className="receiveStatecoin-scan-txid">
              <CopiedButton
                handleCopy={copyAddressToClipboard}
                style={{
                  bottom: "-30px",
                  top: "initial",
                  backgroundColor: "var(--button-border)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "var(--text-primary)",
                  fontWeight: "bold",
                }}
                message="Copied to Clipboard"
                className={"copy-btn-wrap"}
              >
                <div className="address-index">
                  <div className="address">
                    <span className="rec-address">
                      {tokenFee === 0
                        ? "Go Back - Select statecoin values"
                        : address.addr}
                    </span>
                  </div>
                  <div className="info-receive">
                    <div className="info-container">
                      <span className="tooltip-info index">
                        <div>Token Deposit</div>
                      </span>
                    </div>
                  </div>
                </div>
              </CopiedButton>
            </div>
          </div>
        </div>
        <div>
          <AddressInput
            inputAddr={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Token ID"
            smallTxtMsg="Token ID"
          />
        </div>

        {balance && (
          <div style={{ margin: "auto", width: "50%", padding: "10px" }}>
            <p>Remaining balance: {balance}</p>
          </div>
        )}

        <div>
          <button className="Body-button verify-token" onClick={handleConfirm}>
            Confirm Token
          </button>
          <button className="Body-button verify-token" onClick={handleBalance}>
            Check Balance
          </button>
        </div>
      </div>
    </div>
  ) : (
    <>
      <div style={{ margin: "auto", width: "50%", padding: "10px" }}>
        Generating statecoins
      </div>
      <Spinner animation="border" variant="primary"></Spinner>
    </>
  );
};

export default DepositToken;
