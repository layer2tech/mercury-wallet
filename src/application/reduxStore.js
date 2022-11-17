import { configureStore } from "@reduxjs/toolkit";
import { getDefaultMiddleware } from "@reduxjs/toolkit";
import rootReducer from "../reducers";
import { enableMapSet } from "immer";
enableMapSet();
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const persistConfig = {
  key: "main-root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store is the global wallet GUI data structure.
// Non-state data shared between components is stored here.
// State is accessed and modified via reducers, which are defined in /src/features/
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

const Persistor = persistStore(store);

export { Persistor };
