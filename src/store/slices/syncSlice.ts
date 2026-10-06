import { createSlice } from '@reduxjs/toolkit';

interface SyncState {
  pendingWrites: number; // count of in-flight Firestore writes
}

const initialState: SyncState = { pendingWrites: 0 };

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    pendingWriteStart: (state) => { state.pendingWrites += 1; },
    pendingWriteDone:  (state) => { state.pendingWrites = Math.max(0, state.pendingWrites - 1); },
  },
});

export const { pendingWriteStart, pendingWriteDone } = syncSlice.actions;
export default syncSlice.reducer;

/** Selector: true when all writes have settled. */
export const selectIsSynced = (state: { sync: SyncState }) =>
  state.sync.pendingWrites === 0;
