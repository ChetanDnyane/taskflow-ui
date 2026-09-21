import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { readSession, type Session } from '../../lib/session';

// #region Authentication state has no passwords and no copied task data
// Storage is managed by store middleware, keeping reducers free of side effects.
// The reason survives sign-out to explain session expiry on the login screen.
// #endregion
export interface AuthState {
  session: Session | null;
  reason: string | null;
}
const initialState: AuthState = { session: readSession(), reason: null };
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, action: PayloadAction<Session>) {
      state.session = action.payload;
      state.reason = null;
    },
    signedOut(state, action: PayloadAction<string | undefined>) {
      state.session = null;
      state.reason = action.payload || null;
    },
  },
});
export const { signedIn, signedOut } = authSlice.actions;
export default authSlice.reducer;
