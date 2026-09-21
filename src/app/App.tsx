import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store';
import { signedOut } from '../features/auth/authSlice';
import { AuthPage } from '../features/auth/AuthPage';
import { Workspace } from '../features/tasks/Workspace';
import { NewTaskRoute, TaskDetailRoute } from '../features/tasks/TaskEditor';

// #region Route protection is a UX guard; Spring remains the security boundary
// Expiry is checked by a timer and on focus so sleeping tabs also sign out promptly.
// Protected API 401s handle server-side rejection before the local expiry time.
// #endregion
function ProtectedRoute() {
  const session = useAppSelector((state) => state.auth.session);
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
export function App() {
  const session = useAppSelector((state) => state.auth.session);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!session) return;
    const expire = () => {
      if (Date.now() >= session.expiresAt)
        dispatch(signedOut('Your session has expired. Please sign in again.'));
    };
    const timer = window.setTimeout(
      expire,
      Math.min(Math.max(0, session.expiresAt - Date.now()), 2147483647),
    );
    window.addEventListener('focus', expire);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', expire);
    };
  }, [session, dispatch]);
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/register" element={<AuthPage key="register" register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/tasks" element={<Workspace />}>
          <Route path="new" element={<NewTaskRoute />} />
          <Route path=":id" element={<TaskDetailRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={session ? '/tasks' : '/login'} replace />} />
    </Routes>
  );
}
