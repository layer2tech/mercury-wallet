import CopiedButton from "../CopiedButton/CopiedButton";
import copy_img from "../../images/icon2.png";

const NodeId = ({ nodeID }) => {
  const copyAddressToClipboard = (event, address) => {
    event.stopPropagation();
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="Body send-channel">
      Your Node ID: <br />
      <div className="flex items-center justify-center p-[8px] m-[0 auto]">
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
