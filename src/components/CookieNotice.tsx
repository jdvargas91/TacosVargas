import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useConsent } from "@/context/ConsentContext";

export function CookieNotice() {
  const { consent, settingsOpen, acceptAll, acceptNecessary, saveMap, closeSettings } = useConsent();
  const open = consent === null || settingsOpen;
  const titleId = useId();
  const barRef = useRef<HTMLElement>(null);
  const [mapOn, setMapOn] = useState(consent?.map ?? false);

  useEffect(() => {
    setMapOn(consent?.map ?? false);
  }, [consent, settingsOpen]);

  useEffect(() => {
    const bar = barRef.current;
    if (!open || !bar) {
      document.documentElement.style.removeProperty("--cookie-bar");
      return;
    }
    const apply = () => {
      document.documentElement.style.setProperty("--cookie-bar", `${bar.offsetHeight + 12}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--cookie-bar");
    };
  }, [open, settingsOpen, mapOn]);

  if (!open) return null;

  return (
    <section
      ref={barRef}
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-ink/10 bg-paper px-4 py-4 shadow-[0_-12px_32px_rgb(30_23_16_/0.12)] md:px-6"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[68ch]">
          <h2 id={titleId} className="font-display text-2xl text-ink">
            Cookies
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-clay">
            Guardamos en este navegador lo necesario para tu pedido y tu sesión. El mapa de la ubicación pide imágenes a
            OpenStreetMap y solo se carga si lo aceptas.
          </p>
          <p className="mt-2 text-sm">
            <Link to="/privacidad" className="cursor-pointer text-ember hover:underline">
              Privacidad
            </Link>
            <span className="text-clay"> · </span>
            <Link to="/terminos" className="cursor-pointer text-ember hover:underline">
              Términos
            </Link>
          </p>
        </div>

        {settingsOpen ? (
          <form
            className="flex w-full max-w-md flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveMap(mapOn);
            }}
          >
            <fieldset className="space-y-2">
              <legend className="sr-only">Tipos de cookies</legend>
              <p className="rounded-[10px] border border-ink/10 bg-white px-3 py-2 text-sm text-ink">
                Necesarias, siempre activas. Carrito, sesión y esta elección.
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-ink/10 bg-white px-3 py-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#C4452A]"
                  checked={mapOn}
                  onChange={(event) => setMapOn(event.target.checked)}
                />
                <span>Mapa de OpenStreetMap en la sección de ubicación.</span>
              </label>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeSettings} className="btn-secondary h-11 px-4 text-sm">
                Cerrar
              </button>
              <button type="submit" className="btn-accent h-11 px-5 text-sm">
                Guardar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button type="button" onClick={acceptNecessary} className="btn-secondary h-11 px-4 text-sm">
              Solo las necesarias
            </button>
            <button type="button" onClick={acceptAll} className="btn-accent h-11 px-5 text-sm">
              Aceptar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
