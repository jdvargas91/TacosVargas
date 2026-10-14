import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContentContext";

/** Video de prueba en el hero. Quitar o sustituir cuando se confirme el asset final. */
const HERO_VIDEO = "/hero.mp4";
/** Más lento que 1.0 para que el movimiento se sienta cinematográfico. */
const HERO_PLAYBACK_RATE = 0.65;
/** Tras la primera pasada completa, el video se queda en este tramo. */
const HERO_LOOP_START = 1;
const HERO_LOOP_END = 10;
/** Anticipo (en segundos de video) para arrancar la capa oculta antes del corte. */
const HERO_LOOP_LEAD = 0.18;

export function Hero() {
  const { business, hero } = useSiteContent();
  const reduce = useReducedMotion();
  const primaryRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const useVideo = Boolean(HERO_VIDEO) && !reduce;

  useEffect(() => {
    const primary = primaryRef.current;
    const loop = loopRef.current;
    if (!primary || !loop) return;

    let holding = false;
    let active: HTMLVideoElement = primary;
    let standby: HTMLVideoElement = loop;
    let switching = false;
    let raf = 0;

    const applyRate = (video: HTMLVideoElement) => {
      video.playbackRate = HERO_PLAYBACK_RATE;
    };

    const show = (video: HTMLVideoElement, on: boolean) => {
      video.style.opacity = on ? "1" : "0";
    };

    const loopEnd = (video: HTMLVideoElement) => {
      if (!Number.isFinite(video.duration)) return HERO_LOOP_END;
      return Math.min(HERO_LOOP_END, Math.max(HERO_LOOP_START + 0.2, video.duration - 0.04));
    };

    const prepStandby = () => {
      applyRate(standby);
      if (Math.abs(standby.currentTime - HERO_LOOP_START) > 0.04) {
        standby.currentTime = HERO_LOOP_START;
      }
    };

    const swapToStandby = () => {
      if (switching) return;
      switching = true;
      applyRate(standby);
      if (Math.abs(standby.currentTime - HERO_LOOP_START) > 0.04) {
        standby.currentTime = HERO_LOOP_START;
      }

      const start = () => {
        void standby
          .play()
          .then(() => {
            show(standby, true);
            show(active, false);
            active.pause();
            const previous = active;
            active = standby;
            standby = previous;
            standby.currentTime = HERO_LOOP_START;
            switching = false;
          })
          .catch(() => {
            switching = false;
          });
      };

      if (standby.readyState >= 2) start();
      else {
        const onReady = () => {
          standby.removeEventListener("seeked", onReady);
          standby.removeEventListener("canplay", onReady);
          start();
        };
        standby.addEventListener("seeked", onReady, { once: true });
        standby.addEventListener("canplay", onReady, { once: true });
      }
    };

    const tick = () => {
      if (holding && !switching) {
        const end = loopEnd(active);
        if (active.currentTime >= end - HERO_LOOP_LEAD) {
          prepStandby();
        }
        if (active.currentTime >= end - 0.03) {
          swapToStandby();
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const enterHold = () => {
      if (holding) return;
      holding = true;
      applyRate(loop);
      loop.currentTime = HERO_LOOP_START;
      const reveal = () => {
        void loop.play().then(() => {
          show(loop, true);
          show(primary, false);
          primary.pause();
          primary.currentTime = HERO_LOOP_START;
          active = loop;
          standby = primary;
        });
      };
      if (loop.readyState >= 2) reveal();
      else loop.addEventListener("seeked", reveal, { once: true });
    };

    const onEnded = () => {
      enterHold();
    };

    const onLoaded = () => {
      applyRate(primary);
      applyRate(loop);
      loop.currentTime = HERO_LOOP_START;
    };

    applyRate(primary);
    applyRate(loop);
    show(primary, true);
    show(loop, false);
    primary.addEventListener("loadedmetadata", onLoaded);
    primary.addEventListener("play", () => applyRate(primary));
    loop.addEventListener("play", () => applyRate(loop));
    primary.addEventListener("ended", onEnded);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      primary.removeEventListener("loadedmetadata", onLoaded);
      primary.removeEventListener("ended", onEnded);
    };
  }, [useVideo]);

  return (
    <section id="inicio" className="relative isolate min-h-svh overflow-hidden bg-carbon">
      {useVideo ? (
        <>
          <video
            ref={primaryRef}
            className="hero-media absolute inset-0 h-full w-full"
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
          <video
            ref={loopRef}
            className="hero-media absolute inset-0 h-full w-full"
            muted
            playsInline
            preload="auto"
            aria-hidden
            style={{ opacity: 0 }}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        </>
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

      <motion.div
        className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-4 pb-16 pt-28 md:px-6 md:pb-28"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
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
      </motion.div>
    </section>
  );
}
