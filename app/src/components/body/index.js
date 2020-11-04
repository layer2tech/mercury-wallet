import React from 'react';
import './index.css';
import Button from '../buttons/standardButton';
import { StoredData } from '../storedData'
import { DisplayItem } from '../displayItem'


const wasmFn = () => {
  import('client-wasm').then(module => {
    module.call_curv_fn()
    // console.log("Rust string: ", module.greet_wo_alert());
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
