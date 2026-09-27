import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  id?: string;
};

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar",
  disabled = false,
  className,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const triggerId = id ?? `${autoId}-trigger`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "ui-select-trigger flex h-11 w-full items-center justify-between gap-2 border border-ink/15 bg-white px-3 text-left text-sm text-ink transition",
          "hover:border-ink/25 focus-visible:border-terracotta",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={cn("truncate", !selected && "text-clay")}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-clay transition", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className="ui-select-content absolute z-40 mt-1 max-h-60 w-full overflow-auto border border-ink/10 bg-white p-1 shadow-[0_12px_32px_rgb(30_23_16_/0.14)]"
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  disabled={opt.disabled}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left text-sm transition",
                    isActive ? "bg-terracotta/12 font-medium text-ink" : "text-ink hover:bg-ink/5",
                    opt.disabled && "cursor-not-allowed opacity-40",
                  )}
                  onClick={() => {
                    if (opt.disabled) return;
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isActive ? <Check size={15} className="shrink-0 text-ember" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
