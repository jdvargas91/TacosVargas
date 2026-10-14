import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { useConsent } from "@/context/ConsentContext";
import { useSiteContent } from "@/context/SiteContentContext";

export function LocationMap() {
  const { business } = useSiteContent();
  const { consent, openSettings } = useConsent();
  const allowMap = consent?.map === true;
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const locationRef = useRef(business.location);
  locationRef.current = business.location;

  useEffect(() => {
    if (!allowMap) return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    void (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !hostRef.current) return;
      const L = leaflet.default;
      const location = locationRef.current;
      const pin = L.divIcon({
        className: "",
        html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#f0734f;box-shadow:0 10px 18px rgb(30 23 16 / 0.28)"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const map = L.map(host, { scrollWheelZoom: false }).setView([location.lat, location.lng], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      L.marker([location.lat, location.lng], { icon: pin }).addTo(map).bindPopup(location.label);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [allowMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([business.location.lat, business.location.lng], map.getZoom());
  }, [business.location.lat, business.location.lng]);

  return (
    <section id="ubicacion" className="location-section px-4 py-24 md:px-6">
      <img className="location-section__photo" src="/ubicacion.webp" alt="" loading="lazy" decoding="async" />
      <div className="location-section__wash" aria-hidden />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-display text-4xl text-ink md:text-5xl">Dónde estamos</h2>
          <span className="mark" aria-hidden />
          <p className="mt-4 text-clay">{business.location.label}</p>
          {business.location.landmark ? (
            <p className="mt-2 text-clay">{business.location.landmark}</p>
          ) : null}
          <p className="mt-3 text-clay">
            {business.hours.days} · {business.hours.label} · WhatsApp {business.phone}
          </p>
          {business.location.mapsUrl ? (
            <a
              href={business.location.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary mt-6 inline-flex h-11 items-center gap-2 px-5"
            >
              <ExternalLink size={16} aria-hidden />
              Abrir en Google Maps
            </a>
          ) : null}
        </Reveal>
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {allowMap ? (
            <div ref={hostRef} className="location-map" />
          ) : (
            <div className="location-map grid place-items-center px-6 text-center">
              <div className="max-w-[36ch]">
                <p className="text-sm leading-relaxed text-ink">
                  El mapa se carga cuando aceptas la cookie de OpenStreetMap. La dirección y el enlace de arriba siguen
                  disponibles.
                </p>
                <button type="button" onClick={openSettings} className="btn-secondary mt-4 h-11 px-5 text-sm">
                  Elegir cookies
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
