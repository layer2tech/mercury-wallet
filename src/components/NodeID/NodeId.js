import React from "react";
import CopiedButton from "../CopiedButton";
import copy_img from "../../images/icon2.png";

const NodeId = ({ nodeID }) => {
  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation();
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="Body send-channel">
      Your Node ID: <br />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
          margin: "0 auto",
        }}
      >
        <span className="long">
          <b>{nodeID}</b>
        </span>
        <CopiedButton
          style={{ marginLeft: "8px" }}
          handleCopy={(event) => copyAddressToClipboard(event, nodeID)}
        >
          <img type="button" src={copy_img} alt="icon" />
        </CopiedButton>
      </div>
    </div>
  );
};

export default NodeId;
