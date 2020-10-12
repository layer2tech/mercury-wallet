
import React from 'react';
import './index.css';
import logo from '../../images/tri-color - negative@4x.png';

class Header extends React.Component {
  render() {
    return (
      <div className="Header">
        <img src={logo} className="Header-logo" alt="logo" />
      </div>
    );
  }
}

export default Header;
