import { configureStore } from '@reduxjs/toolkit';
import globalReducer from './globalSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    global: globalReducer,
    chat: chatReducer,
  },
});
