import { LogIn, X } from "lucide-react";

export function GoogleGateModal({
  open,
  title,
  body,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-carbon/80 p-4" role="dialog" aria-modal="true" aria-labelledby="google-gate-title">
      <div className="w-full max-w-md rounded-2xl bg-smoke p-6 text-ink shadow-[0_18px_40px_rgb(30_23_16_/_0.18)]">
        <div className="flex items-start justify-between gap-4">
          <h2 id="google-gate-title" className="font-display text-3xl">
            {title}
          </h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15">
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-clay">{body}</p>
        {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
        <button
          type="button"
          onClick={onConfirm}
          className="btn-accent mt-6 w-full"
        >
          <LogIn size={18} aria-hidden />
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
