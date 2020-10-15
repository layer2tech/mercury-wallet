import React from 'react';
import './index.css';
import Button from '../buttons/standardButton';
import { StoredData } from '../storedData'
import { DisplayItem } from '../displayItem'

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
        <StoredData />
        <DisplayItem />
      </div>
    );
  }
}

export default Body;
