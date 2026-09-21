import { Check } from 'lucide-react';

// #region Shared wordmark for authentication and workspace navigation
// The icon is decorative; the visible product name supplies the accessible label.
// #endregion
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Check size={23} strokeWidth={3} />
      </span>
      <span>
        taskflow<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
