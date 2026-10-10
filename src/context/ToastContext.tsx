import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
};

type ToastApi = {
  push: (tone: ToastTone, title: string, body?: string) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const toneStyles: Record<
  ToastTone,
  { wrap: string; icon: typeof CheckCircle2; iconClass: string }
> = {
  success: {
    wrap: "border-emerald-500/30 bg-emerald-50 text-emerald-950",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  error: {
    wrap: "border-terracotta/35 bg-terracotta/10 text-ink",
    icon: XCircle,
    iconClass: "text-terracotta",
  },
  info: {
    wrap: "border-sky-500/30 bg-sky-50 text-sky-950",
    icon: Info,
    iconClass: "text-sky-600",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, body?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((current) => [...current.slice(-4), { id, tone, title, body }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, body) => push("success", title, body),
      error: (title, body) => push("error", title, body),
      info: (title, body) => push("info", title, body),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-end gap-2 p-4 sm:p-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const style = toneStyles[item.tone];
            const Icon = style.icon;
            return (
              <motion.div
                key={item.id}
                layout
                initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[10px] border px-4 py-3 shadow-[0_12px_28px_rgb(30_23_16_/0.12)]",
                  style.wrap,
                )}
                role="status"
              >
                <Icon size={20} className={cn("mt-0.5 shrink-0", style.iconClass)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{item.title}</p>
                  {item.body ? <p className="mt-0.5 text-sm leading-snug opacity-90">{item.body}</p> : null}
                </div>
                <button
                  type="button"
                  aria-label="Cerrar aviso"
                  onClick={() => dismiss(item.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] opacity-70 transition hover:bg-black/5 hover:opacity-100"
                >
                  <X size={16} aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
