import React from "react";
import CopiedButton from "../CopiedButton";
import copy_img from "../../images/icon2.png";

const EmptyPanel = ({ text, textData, hasCopyBtn }) => {
  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation();
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="Body send-channel">
      {text} {hasCopyBtn ? ": " : null} <br />
      {hasCopyBtn ? (
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
            <b>{textData}</b>
          </span>
          <CopiedButton
            style={{ marginLeft: "8px" }}
            handleCopy={(event) => copyAddressToClipboard(event, textData)}
          >
            <img type="button" src={copy_img} alt="icon" />
          </CopiedButton>
        </div>
      ) : (
        <div> {textData} </div>
      )}
    </div>
  );
};

export default EmptyPanel;
