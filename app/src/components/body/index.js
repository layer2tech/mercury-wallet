import React from 'react';
import './index.css';
import Button from '../buttons/standardButton';
import { StoredData } from '../storedData'
import { DisplayItem } from '../displayItem'

const wasmFn = () => {
  import('wasm-temp').then(module => {
    console.log(module.greet());
    console.log(module.greet_wo_alert());
  })
}

class Body extends React.Component {
  render() {
    return (
      <div className="Body">
        <Button
          label="Access Rust!"
          onClick={wasmFn}
          className="Body-button"/>
        <StoredData />
        <DisplayItem />
      </div>
    );
  }
}

export default Body;
