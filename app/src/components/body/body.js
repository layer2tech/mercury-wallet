import React from 'react';

import { StdButton, DisplayItem, StoredData } from '../';

import './body.css';

const wasmFn = () => {
  import('client-wasm').then(module => {
    module.call_curv_fn()
    // console.log("Rust string: ", module.greet_wo_alert());
  })
}


const Body = () => {
  return (
    <div className="Body">
      <StdButton
        label="Access Rust!"
        onClick={wasmFn}
        className="Body-button"/>
      <StoredData />
      <DisplayItem />
    </div>
  );
}

export default Body;
