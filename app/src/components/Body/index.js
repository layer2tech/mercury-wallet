import React from 'react';
import './index.css';
import Button from '../buttons/standardButton';
import { StoredData } from '../storedData'
import { DisplayItem } from '../displayItem'

class Body extends React.Component {
  render() {
    return (
      <div className="Body">
        <Button
          label="Button!"
          className="Body-button"/>
        <StoredData />
        <DisplayItem />
      </div>
    );
  }
}

export default Body;
