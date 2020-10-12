import React from 'react';

class Button extends React.Component {
  constructor(props) {
    super(props);
    this.label = props.label;
    this.state = {isToggleOn: true};

    // This binding is necessary to make `this` work in the callback
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    console.log(this.label,"button clicked.");
  }

  render() {
    return (
      <button onClick={this.handleClick} className={this.props.className}>
        {this.label}
      </button>
    );
  }
}

export default Button;
