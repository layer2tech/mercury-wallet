import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { getDefaultMiddleware } from '@reduxjs/toolkit';

import App from './containers/App/App';
import rootReducer from './reducers'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';


// Store is the global wallet GUI data structure.
// Non-state data shared between components is stored here.
// State is accessed and modified via reducers, which are defined in /src/features/
const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware({
  serializableCheck: false
}),
})

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);

