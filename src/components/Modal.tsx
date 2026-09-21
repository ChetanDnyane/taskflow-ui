import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

// #region Native dialog supplies focus trapping, Escape handling and inert background
// Preserve the trigger's focus on close. Pending writes prevent dismissal so the
// user cannot lose track of an operation whose outcome has not arrived yet.
// #endregion
export function Modal({
  title,
  subtitle,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const focused = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
