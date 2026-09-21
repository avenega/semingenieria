import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type ToastKind = 'ok' | 'error';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type FlashState = {
  toasts: Toast[];
  setMsg: (v: string) => void;
  setErr: (v: string) => void;
  clear: () => void;
  dismiss: (id: string) => void;
};

const FlashContext = createContext<FlashState | null>(null);
const TOAST_MS = 4200;

export function FlashProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const text = message.trim();
      if (!text) return;
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-4), { id, kind, message: text }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_MS);
    },
    [],
  );

  const setMsg = useCallback((v: string) => push('ok', v), [push]);
  const setErr = useCallback((v: string) => push('error', v), [push]);
  const clear = useCallback(() => setToasts([]), []);

  const value = useMemo(
    () => ({ toasts, setMsg, setErr, clear, dismiss }),
    [toasts, setMsg, setErr, clear, dismiss],
  );

  return <FlashContext.Provider value={value}>{children}</FlashContext.Provider>;
}

export function useFlash() {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error('useFlash fuera de FlashProvider');
  return ctx;
}

export function ToastHost() {
  const { toasts, dismiss } = useFlash();
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
        >
          <div className="toast-icon" aria-hidden="true">
            <i
              className={`fa-solid ${
                toast.kind === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'
              }`}
            />
          </div>
          <div className="toast-body">
            <strong>{toast.kind === 'error' ? 'Error' : 'Listo'}</strong>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="toast-close"
            aria-label="Cerrar"
            onClick={() => dismiss(toast.id)}
          >
            <i className="fa-solid fa-xmark" />
          </button>
          <div className="toast-progress" />
        </div>
      ))}
    </div>,
    document.body,
  );
}

/** @deprecated use ToastHost — kept as alias during migration */
export const FlashAlerts = ToastHost;
