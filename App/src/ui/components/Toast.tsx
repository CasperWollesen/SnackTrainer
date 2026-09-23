import { useToast } from '../hooks/useToast';

/** Single bottom toast with optional undo-style action. */
export function Toast() {
  const { current, dismiss } = useToast();
  if (!current) return null;
  const isError = current.variant === 'error';
  return (
    <div
      className={`toast${isError ? ' toast--error' : ''}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <span className="toast__text">{current.message}</span>
      {current.actionLabel && current.onAction ? (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            dismiss();
            void current.onAction?.();
          }}
        >
          {current.actionLabel}
        </button>
      ) : null}
    </div>
  );
}
