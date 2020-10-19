import React from 'react';
import './index.css';
import Button from '../buttons/standardButton';
import { StoredData } from '../storedData'
import { DisplayItem } from '../displayItem'
const client_lib = window.require("client");

const getNewAddress = () => {
  console.log(client_lib.apiGenBTCAddr());
}

class Body extends React.Component {
  render() {
    return (
      <div className="Body">
        <Button
          label="Access Rust!"
          onClick={getNewAddress}
          className="Body-button"/>
        <StoredData />
        <DisplayItem />
      </div>
    );
  }
}

export default Body;
