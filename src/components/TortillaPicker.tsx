import { cn } from "@/lib/cn";
import type { Tortillas } from "@/lib/cart";

/** Selector elegante de tortillas: dos (habitual) o una. No afecta precio. */
export function TortillaPicker({
  value,
  onChange,
  className,
}: {
  value: Tortillas;
  onChange: (next: Tortillas) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-ink">¿Cómo lo quieres?</p>
      <div
        role="radiogroup"
        aria-label="Cantidad de tortillas"
        className="grid grid-cols-2 gap-2 rounded-[10px] bg-ink/[0.04] p-1"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === 2}
          onClick={() => onChange(2)}
          className={cn(
            "relative rounded-[10px] px-3 py-3 text-left transition",
            value === 2
              ? "bg-white shadow-[0_6px_18px_rgb(30_23_16_/0.10)] ring-1 ring-terracotta/35"
              : "hover:bg-white/60",
          )}
        >
          <span className="block text-sm font-semibold text-ink">Doble tortilla</span>
          <span className="mt-0.5 block text-xs text-clay">Lo habitual</span>
          {value === 2 ? (
            <span className="absolute right-2 top-2 rounded-full bg-terracotta/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember">
              Normal
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 1}
          onClick={() => onChange(1)}
          className={cn(
            "rounded-[10px] px-3 py-3 text-left transition",
            value === 1
              ? "bg-white shadow-[0_6px_18px_rgb(30_23_16_/0.10)] ring-1 ring-terracotta/35"
              : "hover:bg-white/60",
          )}
        >
          <span className="block text-sm font-semibold text-ink">Una tortilla</span>
          <span className="mt-0.5 block text-xs text-clay">Tu elección</span>
        </button>
      </div>
      <p className="text-xs leading-relaxed text-clay">
        El precio es el mismo. Dos tortillas es lo normal del taco; si prefieres una sola, es tu decisión y no baja el
        valor.
      </p>
    </div>
  );
}
