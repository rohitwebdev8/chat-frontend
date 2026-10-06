import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DailyLog } from '@/types/tracker';

interface TrackerState {
  isModalOpen: boolean;
  activeDate: string | null;
  logs: Record<string, DailyLog>;
  isLoading: boolean;
}

const initialState: TrackerState = {
  isModalOpen: false,
  activeDate: null,
  logs: {},
  isLoading: false,
};

export const trackerSlice = createSlice({
  name: 'tracker',
  initialState,
  reducers: {
    openTrackerModal: (state, action: PayloadAction<string | undefined>) => {
      state.isModalOpen = true;
      if (action.payload) {
        state.activeDate = action.payload;
      }
    },
    closeTrackerModal: (state) => {
      state.isModalOpen = false;
    },
    setLogs: (state, action: PayloadAction<Record<string, DailyLog>>) => {
      state.logs = action.payload;
    },
    updateSingleLog: (state, action: PayloadAction<DailyLog>) => {
      state.logs[action.payload.date] = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  openTrackerModal,
  closeTrackerModal,
  setLogs,
  updateSingleLog,
  setIsLoading,
} = trackerSlice.actions;

export default trackerSlice.reducer;
