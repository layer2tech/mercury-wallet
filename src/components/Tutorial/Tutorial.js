"use strict";
import { useDispatch } from "react-redux";
import VideoPlaceholder from "../../assets/images/video-placeholder.png";
import {
  callUpdateConfig,
  setNotification,
} from "../../features/WalletDataSlice";
import "./Tutorial.css";

const Tutorial = () => {
  const dispatch = useDispatch();
  const hideTutorial = () => {
    callUpdateConfig({
      tutorials: false,
    });
    dispatch(setNotification({ msg: "Settings successfully updated." }));
  };
  return (
    <div className="tutorial-page">
      <div className="tutorial-media">
        <img src={VideoPlaceholder} alt="video placeholder" />
      </div>
      <div className="tutorial-content">
        <h2 className="title">Welcome to Mercury Wallet</h2>
        <h4 className="sub-title">Tutorial</h4>
        <p>
          Lorem ipsum dolor sit short 3 - 5 sentence explainer on how the
          swapping works and what the user should expect.
        </p>
        <div className="tutorial-btns">
          <button type="button">Skip</button>
          <button type="button">Next</button>
          <button
            type="button"
            className="hide-tutorial"
            onClick={hideTutorial}
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
