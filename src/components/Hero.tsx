import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { business } from "@/data/business";

export function Hero() {
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
    <section id="inicio" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-carbon">
      <motion.img
        src="/hero.png"
        alt="Tacos recién hechos sobre plancha, vapor y limón"
        fetchPriority="high"
        className="hero-media w-full max-md:mt-16 max-md:h-auto md:absolute md:inset-0 md:h-full"
        initial={{ scale: 1 }}
        animate={kenBurns ? { scale: 1.06 } : undefined}
        transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      />
      <div className="absolute inset-0 hidden bg-gradient-to-t from-carbon/90 via-carbon/40 to-carbon/20 md:block" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-5 md:min-h-svh md:justify-end md:px-6 md:pb-28 md:pt-28">
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
          {business.hours.days} · {business.hours.label} · Colima
        </p>
      </div>
    </section>
  );
}
