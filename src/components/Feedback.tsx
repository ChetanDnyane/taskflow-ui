import { AlertCircle, LoaderCircle } from 'lucide-react';

// #region Consistent accessible feedback for asynchronous requests
// Alert messages are announced immediately; loading states use a polite status.
// #endregion
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
}
export function Loading({ label = 'Loading your tasks…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  );
}
