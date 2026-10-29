"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { Toast } from "@/components/ui/Toast";

export type ToastVariant = "success" | "error";

interface ToastItem extends Toast {
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (params: { variant: ToastVariant; title: string; description?: string }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_TIMEOUT_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    ({ variant, title, description }: { variant: ToastVariant; title: string; description?: string }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, variant, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_TIMEOUT_MS);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
