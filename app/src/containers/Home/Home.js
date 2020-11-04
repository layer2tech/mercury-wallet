import React from 'react';
import Body from '../../components/body'

import { withRouter } from "react-router-dom";


const HomePage = () => {
  return (
    <div className="home-page">
      <Body />
    </div>
  )
}

export default withRouter(HomePage);
