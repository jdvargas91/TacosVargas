import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirmar",
  cancelLabel = "Volver",
  busyLabel,
  busy = false,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  tone?: "danger" | "accent";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-carbon/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="card-shadow w-full max-w-md rounded-2xl border border-ink/8 bg-smoke p-6 text-ink"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-3xl leading-tight">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onCancel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-clay">{body}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="btn-secondary h-11 px-5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={
              tone === "danger"
                ? "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-terracotta/40 bg-terracotta px-5 text-sm font-semibold text-white transition enabled:hover:bg-ember disabled:opacity-50"
                : "btn-accent h-11 px-5 disabled:opacity-50"
            }
          >
            {busy ? (busyLabel ?? "Procesando…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
