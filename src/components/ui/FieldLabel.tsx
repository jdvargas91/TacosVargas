import type { ReactNode } from "react";

/** Label con asterisco rojo opcional para campos requeridos. */
export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <>
      <span className="font-medium text-ink/80">
        {children}
        {required ? (
          <span className="ml-0.5 text-terracotta" aria-hidden>
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (obligatorio)</span> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-xs text-clay">{hint}</span> : null}
    </>
  );
}
