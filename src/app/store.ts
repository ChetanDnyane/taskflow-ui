import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import auth, { signedIn, signedOut } from '../features/auth/authSlice';
import { persistSession } from '../lib/session';
import { taskflowApi } from '../services/api';

// #region Session lifecycle and private cache isolation
// Clear all cached task responses on logout/expiry, so another account cannot see
// the previous user's data. Persistence is best-effort; Redux remains the source
// of client auth state. RTK Query refetches on reconnect/focus when subscribed.
// #endregion
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: signedIn,
  effect: (action) => {
    persistSession(action.payload);
  },
});
listener.startListening({
  actionCreator: signedOut,
  effect: (_action, api) => {
    persistSession(null);
    api.dispatch(taskflowApi.util.resetApiState());
  },
});
export const store = configureStore({
  reducer: { auth, [taskflowApi.reducerPath]: taskflowApi.reducer },
  middleware: (getDefault) =>
    getDefault().prepend(listener.middleware).concat(taskflowApi.middleware),
});
setupListeners(store.dispatch);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
