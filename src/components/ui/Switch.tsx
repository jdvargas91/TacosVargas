import { useId } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  /** Accesible cuando no hay label visible. */
  ariaLabel?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Color del switch encendido. `success` = verde (disponible). */
  tone?: "accent" | "success";
};

export function Switch({
  checked,
  onCheckedChange,
  label,
  ariaLabel,
  description,
  disabled = false,
  id,
  className,
  tone = "accent",
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;

  const control = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
        checked ? (tone === "success" ? "bg-emerald-500" : "bg-terracotta") : "bg-ink/20",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );

  if (!label && !description) {
    return <div className={className}>{control}</div>;
  }

  return (
    <div className={cn("flex gap-3 rounded-[10px] border border-ink/10 bg-white p-4", className)}>
      <div className="pt-0.5">{control}</div>
      <div className="min-w-0">
        {label ? (
          <label htmlFor={switchId} className="cursor-pointer font-medium text-ink">
            {label}
          </label>
        ) : null}
        {description ? <p className="mt-1 text-xs leading-relaxed text-clay">{description}</p> : null}
      </div>
    </div>
  );
}
