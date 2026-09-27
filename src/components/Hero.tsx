import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContentContext";

export function Hero() {
  const { business, hero } = useSiteContent();
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const kenBurns = !reduce && wide;

  return (
    <section id="inicio" className="relative isolate min-h-svh overflow-hidden bg-carbon">
      <picture>
        <source media="(max-width: 767px)" srcSet={hero.imageMobile} type="image/webp" />
        <motion.img
          src={hero.imageDesktop}
          alt={hero.imageAlt}
          fetchPriority="high"
          className="hero-media absolute inset-0 h-full w-full"
          initial={{ scale: 1 }}
          animate={kenBurns ? { scale: 1.06 } : undefined}
          transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-carbon/85 via-carbon/20 to-carbon/10 md:from-carbon/90 md:via-carbon/40 md:to-carbon/20" />

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
