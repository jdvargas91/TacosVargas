import { cn } from "@/lib/cn";
import type { DrinkSize, DrinkSizeId } from "@/data/seedProducts";
import { formatMxn } from "@/lib/format";

/** Selector de tamaño para aguas frescas (precio según tamaño). */
export function SizePicker({
  sizes,
  value,
  onChange,
  className,
}: {
  sizes: DrinkSize[];
  value: DrinkSizeId;
  onChange: (next: DrinkSizeId) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-ink">Tamaño</p>
      <div
        role="radiogroup"
        aria-label="Tamaño del agua"
        className="grid grid-cols-2 gap-2 rounded-[10px] bg-ink/[0.04] p-1"
      >
        {sizes.map((size) => {
          const active = value === size.id;
          return (
            <button
              key={size.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(size.id)}
              className={cn(
                "rounded-[10px] px-3 py-3 text-left transition",
                active
                  ? "bg-white shadow-[0_6px_18px_rgb(30_23_16_/0.10)] ring-1 ring-terracotta/35"
                  : "hover:bg-white/60",
              )}
            >
              <span className="block text-sm font-semibold text-ink">{size.label}</span>
              <span className="mt-0.5 block text-xs font-medium tabular-nums text-ember">
                {formatMxn(size.priceCents)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
