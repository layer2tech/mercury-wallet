import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import App from './containers/App';
import rootReducer from './reducers'
import './index.css';

// const client_lib = window.require("client");
// client_lib.makeServer();
// console.log(client_lib.apiGenBTCAddr());

// Store is the global wallet GUI data structure.
// Non-state data shared between components is stored here.
// State is accessed and modified via reducers, which are defined in /src/features/

const store = configureStore({
  reducer: rootReducer
})

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
