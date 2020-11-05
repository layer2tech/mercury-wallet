import React from 'react';
import { StdButton } from '../../components/'
import './Settings.css';

import { withRouter } from "react-router-dom";


const change_setting = () => {
  console.log("Change setting")
}

const SettingsPage = () => {
  return (
    <div className="Settings-page">
      <div>
        <StdButton
          label="Settings1"
          onClick={change_setting}
          className="Settings-button"
        />
      </div>
      <div>
        <StdButton
          label="Settings2"
          onClick={change_setting}
          className="Settings-button"
        />
      </div>
    </div>
  )
}

export default withRouter(SettingsPage);
