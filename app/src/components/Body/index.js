import React from 'react';
import './index.css';
import Button from '../buttons/standardButton';
import { StoreText } from '../StoreText'
import { DisplayItemComponent } from '../DisplayItemComponent'

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
        <StoreText />
        <DisplayItemComponent />
      </div>
    );
  }
}

export default Body;
