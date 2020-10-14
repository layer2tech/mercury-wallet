import { configureStore } from '@reduxjs/toolkit'

import storedDataReducer from './reducers/storedData'

export default configureStore({
  reducer: {
    // posts: postsReducer,
    storedData: storedDataReducer
  }
})
