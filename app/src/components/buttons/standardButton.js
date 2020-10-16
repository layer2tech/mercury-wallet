import React from 'react';

class Button extends React.Component {
  constructor(props) {
    super(props);
    this.label = props.label;
    if (!props.onClick) {
      this.onClick = () => { console.log(this.label, " button clicked!") };
    } else {
      this.onClick = props.onClick;
    }

    this.state = {isToggleOn: true};
  }

  render() {
    return (
      <button onClick={this.onClick} className={this.props.className}>
        {this.label}
      </button>
    );
  }
}

export default Button;
