import React from 'react';
import { StdButton } from '../../components/'
import './Settings.css';

import {Link, withRouter} from "react-router-dom";
import arrow from "../../images/arrow-up.png";
import question from "../../images/question-blue.png";


const change_setting = () => {
  console.log("Change setting")
}

const SettingsPage = () => {
  return (
    <div className="container">

      <div className="Body settings">
      </div>
    </div>
  )
}

export default withRouter(SettingsPage);
