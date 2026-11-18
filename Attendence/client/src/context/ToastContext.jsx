import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-purple-200 bg-purple-50 text-purple-700',
};
const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

function ToastCard({ toast, onClose }) {
  const Icon = ICONS[toast.type] || Info;
  return (
    <div className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-lg ${STYLES[toast.type]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button onClick={onClose} className="opacity-50 transition hover:opacity-100" aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  );
}

/** Global toast notifications: toast.success('Saved') / toast.error('Oops') */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const toast = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex w-auto flex-col gap-2 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-[min(92vw,360px)]">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
