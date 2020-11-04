import React from 'react';
import Button from '../../components/buttons/standardButton'
import './Settings.css';

import { withRouter } from "react-router-dom";


const change_setting = () => {
  console.log("Change setting")
}

const SettingsPage = () => {
  return (
    <div className="Settings-page">
      <div>
        <Button
          label="Settings1"
          onClick={change_setting}
          className="Settings-button"
        />
      </div>
      <div>
        <Button
          label="Settings2"
          onClick={change_setting}
          className="Settings-button"
        />
      </div>
    </div>
  )
}

export default withRouter(SettingsPage);
