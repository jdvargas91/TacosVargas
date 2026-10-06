import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContentContext";

/** Video de prueba en el hero. Quitar o sustituir cuando se confirme el asset final. */
const HERO_VIDEO = "/hero.mp4";
/** Más lento que 1.0 para que el movimiento se sienta cinematográfico. */
const HERO_PLAYBACK_RATE = 0.65;

export function Hero() {
  const { business, hero } = useSiteContent();
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const useVideo = Boolean(HERO_VIDEO) && !reduce;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const applyRate = () => {
      video.playbackRate = HERO_PLAYBACK_RATE;
    };
    applyRate();
    video.addEventListener("loadedmetadata", applyRate);
    video.addEventListener("play", applyRate);
    return () => {
      video.removeEventListener("loadedmetadata", applyRate);
      video.removeEventListener("play", applyRate);
    };
  }, [useVideo]);

  return (
    <section id="inicio" className="relative isolate min-h-svh overflow-hidden bg-carbon">
      {useVideo ? (
        <video
          ref={videoRef}
          className="hero-media absolute inset-0 h-full w-full"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <img
          src={hero.imageDesktop}
          alt={hero.imageAlt}
          fetchPriority="high"
          className="hero-media absolute inset-0 h-full w-full"
        />
      )}

      {/* Gradiente general de lectura + banda inferior para tapar la marca de agua */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-carbon via-carbon/35 to-carbon/15 md:from-carbon/95 md:via-carbon/40 md:to-carbon/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-carbon from-40% via-carbon/85 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-4 pb-16 pt-28 md:px-6 md:pb-28">
        <h1 className="sr-only">{business.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/pedido" className="btn-accent">
            <ShoppingBag size={18} aria-hidden />
            Armar pedido
          </Link>
          <a href="#menu" className="btn-ghost">
            <UtensilsCrossed size={18} aria-hidden />
            Ver menú
          </a>
        </div>
        <p className="mt-8 inline-flex items-center gap-2 text-sm text-tortilla/80">
          <Clock size={16} aria-hidden />
          {business.hours.days} · {business.hours.label} · {business.location.city}
        </p>
      </div>
    </section>
  );
}
