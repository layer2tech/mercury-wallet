import { withRouter, Redirect } from "react-router-dom";
import PageHeader from "../PageHeader/PageHeader";
import { useState } from "react";
import plus from "../../images/plus-deposit.png";
import btc_img from "../../images/icon1.png";
import arrow_img from "../../images/scan-arrow.png";
import copy_img from "../../images/icon2.png";
import { CopiedButton, AddressInput, ConfirmPopup } from "../../components";
import "../CreateWalletInfo/CreateWalletInfo.css";
import "./DepositLightning.css";
import {
  callGetAccount,
  checkChannelCreation,
} from "../../features/WalletDataSlice";
import { addInvoice, removeInvoice } from "../../features/LightningDataSlice";
import {
  isWalletLoaded,
  callCreateChannel,
  setError,
} from "../../features/WalletDataSlice";
import { useDispatch, useSelector } from "react-redux";
import closeIcon from "../../images/close-icon.png";
import InvoiceOptions from "../../components/InvoiceOptions/InvoiceOptions";
import { getBIP32forBtcAddress } from "../../wallet/wallet";
import InvoiceModal from "../../components/InvoiceModal/InvoiceModal";

const DepositLightning = (props) => {
  const dispatch = useDispatch();
  const [inputAmt, setInputAmt] = useState("");
  const [inputNodeId, setInputNodeId] = useState("");
  const [pubkey, setPubkey] = useState();
  const [loading, setLoading] = useState(false);
  const invoices = useSelector((state) => state.lightning).invoices;

  const satsToBTC = (sats) => {
    return sats / (1e8).toFixed(2);
  };

  const createChannel = async () => {
    console.log("[DepositLightning.js]: Create a channel");

    // retrieve pubkey/host/port - TODO add validation
    const pubkey = inputNodeId.substring(0, inputNodeId.indexOf("@"));
    let host = inputNodeId.substring(
      inputNodeId.indexOf("@") + 1,
      inputNodeId.lastIndexOf(":")
    );
    host =
      host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
    const port = inputNodeId.slice(inputNodeId.lastIndexOf(":") + 1);

    // validation on amount
    if (inputAmt < 1001) {
      dispatch(
        setError({
          msg: "The amount you have selected is below the minimum limit 1001 SAT. Please increase the amount to proceed with the transaction.",
        })
      );
      return;
    }
    console.log("[DepositLightning.js]: input amount was set as", inputAmt);

    // attempt to create the channel, could fail due to duplicate channel or peer is down
    let nextAddress = await callCreateChannel(inputAmt, inputNodeId);

    const addr = nextAddress;
    const bip32 = getBIP32forBtcAddress(addr, callGetAccount());
    const new_private_key = `p2wpkh:${bip32.toWIF()}`;

    // create deposit if successful
    if (nextAddress) {
      const newInvoice = {
        amt: satsToBTC(inputAmt),
        addr: nextAddress,
        privatekey: new_private_key,
      };
      dispatch(addInvoice(newInvoice));
      setPubkey(pubkey);
    }
  };

  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation();
    navigator.clipboard.writeText(address);
  };

  const handleCloseInvoice = (event) => {
    dispatch(removeInvoice(event.addr));
  };

  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container deposit-ln">
      <PageHeader
        title="Create Channel"
        className="create-channel"
        icon={plus}
        subTitle="Deposit SATS in channel"
      />
      {invoices && invoices.length > 0
        ? invoices.map((invoice) => (
            <div className="Body" data-cy="invoice">
              <div className="main-coin-wrap">
                <InvoiceOptions />
                <InvoiceModal privatekey={invoice.privatekey} />
              </div>
              <div className="deposit-scan">
                <div className="deposit-scan-content">
                  <div className="deposit-scan-main">
                    <div className="deposit-scan-main-item">
                      <img src={btc_img} alt="icon" />
                      <span>
                        <b>{invoice.amt}</b> BTC
                      </span>
                    </div>
                    <img src={arrow_img} alt="arrow" />
                    <div className="deposit-scan-main-item">
                      <>
                        <CopiedButton
                          handleCopy={(event) =>
                            copyAddressToClipboard(event, invoice.addr)
                          }
                        >
                          <img type="button" src={copy_img} alt="icon" />
                        </CopiedButton>
                        <span className="long">
                          <b>{invoice.addr}</b>
                        </span>
                      </>
                    </div>
                    <ConfirmPopup onOk={(e) => handleCloseInvoice(invoice)}>
                      <button
                        className={`primary-btm ghost close-invoice ${invoice.addr} ${pubkey}`}
                      >
                        <img src={closeIcon} alt="close-button" />
                      </button>
                    </ConfirmPopup>
                  </div>
                </div>
              </div>
              <span className="deposit-text">
                Create funding transaction by sending {invoice.amt} BTC to the
                above address in a SINGLE transaction
              </span>
            </div>
          ))
        : null}
      ;
      <div className="withdraw content lightning">
        <div className="Body right lightning">
          <div className="header">
            <h3 className="subtitle">Payee Details</h3>
          </div>

          <div data-cy="amt-input">
            <AddressInput
              inputAddr={inputAmt}
              onChange={(e) => setInputAmt(e.target.value)}
              placeholder="Enter amount (100000=0.001BTC)"
              smallTxtMsg="Amount in SATS"
            />
          </div>
          <div data-cy="nodeid-input">
            <AddressInput
              inputAddr={inputNodeId}
              onChange={(e) => setInputNodeId(e.target.value)}
              placeholder="pubkey@host:port"
              smallTxtMsg="Node Key"
            />
          </div>

          <div data-cy="create-channel">
            <ConfirmPopup
              preCheck={checkChannelCreation}
              argsCheck={[dispatch, inputAmt, inputNodeId]}
              onOk={createChannel}
            >
              <button type="button" className={`btn deposit-button `}>
                {loading ? <Loading /> : "Create Channel"}
              </button>
            </ConfirmPopup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withRouter(DepositLightning);
