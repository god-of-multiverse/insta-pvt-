import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

/** WeChat's centred dark HUD toast. */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="wx-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className="wx-toast" key={toast.id}>
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
