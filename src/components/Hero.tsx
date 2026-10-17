import { useEffect, useRef, useState } from "react";
import { Clock, UtensilsCrossed } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContentContext";

/** Video solo en desktop: en móvil no encaja con el recorte vertical. */
const HERO_VIDEO = "/hero.mp4";
/** Más lento que 1.0 para que el movimiento se sienta cinematográfico. */
const HERO_PLAYBACK_RATE = 0.65;
const DESKTOP_MEDIA = "(min-width: 768px)";

function isDesktopViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DESKTOP_MEDIA).matches;
}

export function Hero() {
  const { business, hero } = useSiteContent();
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const desktopPoster = hero.imageDesktop || "/hero.webp";
  const mobilePoster = hero.imageMobile || "/hero_cel.webp";
  /** Mobile-first: evita montar el video en el HTML inicial / LCP móvil. */
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const useVideo = Boolean(HERO_VIDEO) && !reduce && isDesktop;

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MEDIA);
    const apply = () => setIsDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !useVideo) return;
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
          preload="metadata"
          poster={desktopPoster}
          aria-hidden
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <picture>
          <source media={DESKTOP_MEDIA} srcSet={desktopPoster} />
          <img
            src={mobilePoster}
            alt={hero.imageAlt}
            fetchPriority="high"
            decoding="async"
            width={1080}
            height={1920}
            className="hero-media absolute inset-0 h-full w-full"
          />
        </picture>
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

      <motion.div
        className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-4 pb-16 pt-28 md:px-6 md:pb-28"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="sr-only">
          {business.name} — tacos de camarón capeado, arrachera y desayunos en {business.location.city}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <a href="#menu" className="btn-accent">
            <UtensilsCrossed size={18} aria-hidden />
            Ver menú
          </a>
        </div>
        <p className="mt-8 inline-flex items-center gap-2 text-sm text-tortilla/80">
          <Clock size={16} aria-hidden />
          {business.hours.days} · {business.hours.label} · {business.location.city}
        </p>
      </motion.div>
    </section>
  );
}
