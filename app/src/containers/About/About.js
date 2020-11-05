import React from 'react';
import './About.css';

import { withRouter } from "react-router-dom";

const AboutPage = () => {
  return (
    <div className="Body">
      <h5>Version v0.1.0</h5>
    </div>
  )
}

export default withRouter(AboutPage);
