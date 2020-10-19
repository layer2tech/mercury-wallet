
import React from 'react';
import './index.css';
import logo from '../../images/tri-color - negative@4x.png';
import Button from '../buttons/standardButton';

class Header extends React.Component {
  render() {
    return (
      <div className="Header">
        <img src={logo} className="Header-logo" alt="logo" />
        <Button label="Settings" className="Header-button"/>
        <Button label="About" className="Header-button"/>
      </div>
    );
  }
}

export default Header;
