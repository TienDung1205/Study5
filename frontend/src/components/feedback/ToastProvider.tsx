import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: number;
  message: ReactNode;
  variant: ToastVariant;
};

type ToastContextValue = {
  dismissToast: (id: number) => void;
  showToast: (message: ReactNode, variant?: ToastVariant) => number;
};

const TOAST_DURATION_MS = 5_000;
const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const activeToastKeys = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    activeToastKeys.current.forEach((toastId, key) => {
      if (toastId === id) activeToastKeys.current.delete(key);
    });
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: ReactNode, variant: ToastVariant = 'info') => {
    const toastKey = `${variant}:${getToastContentKey(message)}`;
    const activeToastId = activeToastKeys.current.get(toastKey);
    if (activeToastId) return activeToastId;
    const id = ++nextId.current;
    activeToastKeys.current.set(toastKey, id);
    setToasts((current) => [...current, { id, message, variant }]);
    const timer = setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    timers.current.set(id, timer);
    return id;
  }, [dismissToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    activeToastKeys.current.clear();
  }, []);

  const value = useMemo(() => ({ dismissToast, showToast }), [dismissToast, showToast]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = icons[toast.variant];
        return <div className={`app-toast ${toast.variant}`} role={toast.variant === 'error' ? 'alert' : 'status'} key={toast.id}>
          <Icon className="toast-icon" size={22} aria-hidden="true" />
          <div className="toast-message">{toast.message}</div>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Đóng thông báo"><X size={18} /></button>
          <span className="toast-progress" aria-hidden="true" />
        </div>;
      })}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}

type ToastMessageProps = {
  children: ReactNode;
  variant?: ToastVariant;
};

export function ToastMessage({ children, variant = 'info' }: ToastMessageProps) {
  const { showToast } = useToast();
  const messageKey = getToastContentKey(children);

  useEffect(() => {
    showToast(children, variant);
  }, [messageKey, showToast, variant]);

  return null;
}

function getToastContentKey(content: ReactNode): string {
  if (Array.isArray(content)) return content.map(getToastContentKey).join('');
  if (typeof content === 'string' || typeof content === 'number') return String(content);
  if (content === null || content === undefined || typeof content === 'boolean') return '';
  return String(content);
}
