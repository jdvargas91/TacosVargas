import { useLayoutEffect, useMemo, useRef, useState } from "react";

/** Copias mínimas para que la cinta nunca se quede corta y el bucle no abra un hueco. */
const MIN_COPIES = 2;

export function MarqueeBand({ items }: { items: string[] }) {
  const names = useMemo(() => items.map((item) => item.trim()).filter(Boolean), [items]);
  const groupRef = useRef<HTMLDivElement>(null);
  const copiesRef = useRef(MIN_COPIES);
  const [copies, setCopies] = useState(MIN_COPIES);
  const [seconds, setSeconds] = useState(32);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || names.length === 0) return;

    const fit = () => {
      const current = copiesRef.current;
      const one = group.scrollWidth / current;
      if (!Number.isFinite(one) || one <= 0) return;

      let next = Math.max(MIN_COPIES, Math.ceil(window.innerWidth / one) + 1);
      if (next % 2 !== 0) next += 1;

      const duration = Math.max(18, (one * next) / 90);
      if (next !== current) {
        copiesRef.current = next;
        setCopies(next);
      }
      setSeconds((prev) => (Math.abs(prev - duration) < 0.4 ? prev : Math.round(duration)));
    };

    let cancelled = false;
    const measure = () => {
      if (!cancelled) fit();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [names]);

  if (names.length === 0) return null;

  const line = Array.from({ length: copies }, () => names).flat();

  return (
    <div className="product-marquee">
      <p className="sr-only">{names.join(", ")}</p>
      <div className="product-marquee__track" style={{ animationDuration: `${seconds}s` }} aria-hidden="true">
        {[0, 1].map((group) => (
          <div key={group} ref={group === 0 ? groupRef : undefined} className="product-marquee__group">
            {line.map((name, index) => (
              <span key={`${group}-${index}`}>{name}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
