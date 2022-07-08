'use strict';
import React from 'react';

class StdButton extends React.Component {
  constructor(props) {
    super(props);
    this.label = props.label;
    this.icon = props.icon;
    if (props.onClick) {
      this.onClick = props.onClick;
    } 

    this.state = {isToggleOn: true};
  }

  render() {
    return (
      <button onClick={this.onClick} className={this.props.className}>
        {this.icon ? <img src={this.icon} alt="icon"/>  : ' '}  {this.label}
      </button>
    );
  }
}

export default StdButton;
