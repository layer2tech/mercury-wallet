import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ChannelDetails.css";
import PageHeader from "../PageHeader/PageHeader";
import lightningLogo from "../../assets/images/lightning_logo.png";
import { useLocation } from "react-router-dom";
import EmptyPanel from "../../components/EmptyPanel/EmptyPanel";
import { fromSatoshi } from "../../wallet";
import { CopiedButton } from "../../components";
import plus from "../../assets/images/plus-deposit.png";
import btc_img from "../../assets/images/icon1.png";
import arrow_img from "../../assets/images/scan-arrow.png";
import copy_img from "../../assets/images/icon2.png";
import InvoiceOptions from "../../components/InvoiceOptions/InvoiceOptions";
import RadioButton from "../../components/PanelConnectivity/RadioButton";

const copyAddressToClipboard = (event, address) => {
  event.stopPropagation();
  navigator.clipboard.writeText(address);
};

const ChannelDetails = (props) => {
  const location = useLocation();
  const channel = location.state.props.channel_data;

  console.log("location values:", location);

  const [peers, setPeers] = useState([]);

  useEffect(() => {
    const getPeers = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3003/peer/livePeers"
        );
        console.log("settings peer data:", response.data);
        setPeers(response.data);
      } catch (error) {
        console.log(error);
      }
    };
    getPeers();
  }, []);

  const condition = peers.some((peer) => peer.id === channel.peer_id);

  return (
    <div className="container deposit-ln">
      <PageHeader
        title="Channel Details"
        className="create-channel"
        icon={lightningLogo}
      ></PageHeader>

      <div className="Body">
        <div className="PeerDetailsContainer">
          <div className="RadioButtonContainer">
            <RadioButton
              connection="Peer"
              checked={true}
              condition={condition}
            />
          </div>

          <div className="PeerContainer">
            <div className="PeerContainerLeft">
              <span className="long">
                {peers.find((peer) => peer.id === channel.peer_id)
                  ? "pubkey: " +
                    peers.find((peer) => peer.id === channel.peer_id).pubkey
                  : null}
              </span>
            </div>
            <div className="PeerContainerRight">
              {peers.find((peer) => peer.id === channel.peer_id) ? (
                <CopiedButton
                  handleCopy={(event) =>
                    copyAddressToClipboard(
                      event,
                      peers.find((peer) => peer.id === channel.peer_id).pubkey
                    )
                  }
                >
                  <img type="button" src={copy_img} alt="icon" />
                </CopiedButton>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <EmptyPanel
        text={"Channel amount"}
        textData={
          channel.amount +
          " Satoshis or (" +
          fromSatoshi(channel.amount) +
          " BTC) "
        }
        hasCopyBtn={false}
      />
      <EmptyPanel
        text={"Private Key"}
        textData={channel.privkey}
        hasCopyBtn={true}
      />

      {channel.paid ? (
        <EmptyPanel
          text={"Channel payment details"}
          textData={channel.payment_address}
          hasCopyBtn={true}
        />
      ) : (
        <div className="Body">
          <div className="deposit-scan">
            <div className="deposit-scan-content">
              <div className="deposit-scan-main">
                <div className="deposit-scan-main-item">
                  <img src={btc_img} alt="icon" />
                  <span>
                    <b>{fromSatoshi(channel.amount)}</b> BTC
                  </span>
                </div>
                <img src={arrow_img} alt="arrow" />
                <div className="deposit-scan-main-item">
                  <>
                    <CopiedButton
                      handleCopy={(event) =>
                        copyAddressToClipboard(event, channel.payment_address)
                      }
                    >
                      <img type="button" src={copy_img} alt="icon" />
                    </CopiedButton>
                    <span className="long">
                      <b>{channel.payment_address}</b>
                    </span>
                  </>
                </div>
              </div>
            </div>
          </div>
          <span className="deposit-text">
            Create funding transaction by sending {fromSatoshi(channel.amount)}{" "}
            BTC to the above address in a SINGLE transaction
          </span>
        </div>
      )}
    </div>
  );
};

export default ChannelDetails;
