
import React from 'react';
import './index.css';
import Button from '../buttons/standardButton';

function hello() {
  console.log('button clicked.')
}

class Body extends React.Component {
  render() {
    return (
      <div className="Body">
        <Button
          label="Button!"
          onClick={hello()}
          className="Body-button"/>
      </div>
    );
  }
}

export default Body;
