import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  activeRoomId: string | null;
}

const initialState: ChatState = {
  activeRoomId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveRoom: (state, action: PayloadAction<string>) => {
      state.activeRoomId = action.payload;
    },
  },
});

export const { setActiveRoom } = chatSlice.actions;
export default chatSlice.reducer;
