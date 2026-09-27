import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
};

/** Campo de fecha con apariencia premium (sin checkbox/spinner nativos). */
export function DateField({ value, onChange, id, className, disabled }: DateFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <CalendarDays
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-clay"
        aria-hidden
      />
      <input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="ui-date-input h-11 w-full rounded-[10px] border border-ink/15 bg-white pr-3 pl-10 text-sm text-ink transition hover:border-ink/25 focus-visible:border-terracotta"
      />
    </div>
  );
}
