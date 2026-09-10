import { Minus, Plus } from "lucide-react";

export function QtyStepper({
  value,
  max,
  disabled,
  onChange,
  label,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (qty: number) => void;
  label: string;
}) {
  const locked = disabled || max <= 0;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={`Quitar ${label}`}
        disabled={locked || value <= 0}
        onClick={() => onChange(value - 1)}
        className="grid h-11 w-11 place-items-center rounded-full border border-ink/20 text-ink transition enabled:hover:border-terracotta enabled:hover:bg-gold/30 disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-7 text-center font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Agregar ${label}`}
        disabled={locked || value >= max}
        onClick={() => onChange(value + 1)}
        className="grid h-11 w-11 place-items-center rounded-full border border-ink/20 text-ink transition enabled:hover:border-terracotta enabled:hover:bg-gold/30 disabled:opacity-40"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
