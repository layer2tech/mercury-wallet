import { ProgressBar } from "react-bootstrap";
import Tooltip from "../../Tooltips/Tooltip";

const ProgressContainer = ({
  progressAlert,
  description,
  ifErr,
  percentage,
  subText,
}) => {
  return (
    <div className="progress_bar" id={progressAlert ? "danger" : "success"}>
      <div className="coin-description">
        <p>{description}</p>
      </div>
      {ifErr && (
        <div className="CoinAmountError">
          <div className="scoreAmount">
            Coin in error state: below minimum deposit values
            <Tooltip text="This coin cannot be swapped but can be withdrawn in a batch with other coins." />
          </div>
        </div>
      )}
      <div className="sub">
        <ProgressBar>
          <ProgressBar
            striped
            variant={progressAlert ? "danger" : "success"}
            now={percentage}
            key={1}
          />
        </ProgressBar>
      </div>
      {subText}
    </div>
  );
};

export default ProgressContainer;
