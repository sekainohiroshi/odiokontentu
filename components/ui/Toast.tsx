'use client';
import { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ toast: (msg: string, type?: ToastType) => void }>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none px-4 w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-lg text-center animate-fade-in ${
              t.type === 'success' ? 'bg-emerald-500' :
              t.type === 'error'   ? 'bg-red-500'     : 'bg-blue-500'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
