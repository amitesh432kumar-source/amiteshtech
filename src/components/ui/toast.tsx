"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; message: string };

const ToastContext = createContext<((tone: ToastTone, message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 5000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface p-3.5 shadow-lg",
              toast.tone === "success" && "border-success/40",
              toast.tone === "error" && "border-danger/40",
              toast.tone === "info" && "border-border",
            )}
          >
            <Icon tone={toast.tone} />
            <p className="flex-1 text-sm text-foreground">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="text-muted hover:text-foreground"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Icon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />;
  if (tone === "error") return <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />;
  return <Info className="mt-0.5 size-4 shrink-0 text-brand" />;
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside ToastProvider");
  return push;
}
