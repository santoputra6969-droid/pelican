"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/Icon";

type ToastType = "success" | "error";
type ToastItem = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Aman dipakai di luar provider — tidak menampilkan apa-apa.
    return { toast: () => {} };
  }
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 3200);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] ring-1 ring-black/5"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                t.type === "success"
                  ? "bg-pelican-50 text-pelican-600"
                  : "bg-red-50 text-red-500"
              }`}
            >
              <Icon name={t.type === "success" ? "check" : "plus"} size={18} className={t.type === "error" ? "rotate-45" : ""} />
            </span>
            <p className="flex-1 text-sm font-semibold text-ink">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              aria-label="Tutup"
              className="shrink-0 text-ink-faint transition hover:text-ink"
            >
              <Icon name="plus" size={16} className="rotate-45" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
