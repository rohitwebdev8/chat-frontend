import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import chatReducer from './slices/chatSlice';
import trackerReducer from './slices/trackerSlice';
import syncReducer from './slices/syncSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    tracker: trackerReducer,
    sync: syncReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

