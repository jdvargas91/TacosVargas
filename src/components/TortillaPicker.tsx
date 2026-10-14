import { cn } from "@/lib/cn";
import type { Tortillas } from "@/lib/cart";

/** Selector de tortillas: dos (habitual) o una. No afecta precio. */
export function TortillaPicker({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: Tortillas;
  onChange: (next: Tortillas) => void;
  className?: string;
  /** Layout estrecho (p. ej. línea del carrito en móvil). */
  compact?: boolean;
}) {
  const options: { value: Tortillas; title: string; hint: string; badge?: string }[] = [
    { value: 2, title: "Doble tortilla", hint: "Lo habitual del taco", badge: "Normal" },
    { value: 1, title: "Una tortilla", hint: "Tu elección, mismo precio" },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {compact ? (
        <p className="text-sm font-medium text-ink">Tortillas</p>
      ) : (
        <p className="text-sm font-medium text-ink">¿Cómo lo quieres?</p>
      )}
      <div
        role="radiogroup"
        aria-label="Cantidad de tortillas"
        className="grid grid-cols-1 gap-2 rounded-[10px] bg-ink/[0.04] p-1 sm:grid-cols-2"
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative min-h-11 w-full cursor-pointer rounded-[10px] px-3 py-3 text-left transition",
                active
                  ? "bg-white shadow-[0_6px_18px_rgb(30_23_16_/0.10)] ring-1 ring-terracotta/35"
                  : "hover:bg-white/60",
              )}
            >
              {active && option.badge ? (
                <span className="absolute right-2 top-2 rounded-full bg-terracotta/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember">
                  {option.badge}
                </span>
              ) : null}
              <span className={cn("block text-sm font-semibold leading-snug text-ink", active && option.badge && "pr-14")}>
                {option.title}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-clay">{option.hint}</span>
            </button>
          );
        })}
      </div>
      {compact ? null : (
        <p className="text-xs leading-relaxed text-clay">
          El precio es el mismo. Dos tortillas es lo normal del taco; si prefieres una sola, es tu decisión y no baja el
          valor.
        </p>
      )}
    </div>
  );
}
