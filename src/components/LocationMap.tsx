import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#f0734f;box-shadow:0 10px 18px rgb(30 23 16 / 0.28)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function LocationMap() {
  const { business } = useSiteContent();
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(
      [business.location.lat, business.location.lng],
      16,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    L.marker([business.location.lat, business.location.lng], { icon: pin })
      .addTo(map)
      .bindPopup(business.location.label);
    return () => {
      map.remove();
    };
  }, [business.location.lat, business.location.lng, business.location.label]);

  return (
    <section id="ubicacion" className="px-4 py-24 md:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-display text-4xl leading-[1.05] text-ink md:text-5xl">Dónde estamos</h2>
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
        <Reveal delay={0.1}>
          <div ref={mapRef} className="h-[360px] overflow-hidden rounded-2xl" />
        </Reveal>
      </div>
    </section>
  );
}
