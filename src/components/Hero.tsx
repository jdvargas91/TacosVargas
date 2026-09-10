import { Link } from "react-router-dom";
import { Clock, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { business } from "@/data/business";

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section id="inicio" className="relative isolate min-h-svh overflow-hidden">
      <motion.img
        src="/hero.jpg"
        alt="Tacos recién hechos sobre plancha, vapor y limón"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ scale: 1 }}
        animate={reduce ? undefined : { scale: 1.06 }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-carbon/40 to-carbon/20" />

      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-4 pb-20 pt-28 md:px-6 md:pb-28">
        <h1 className="font-display max-w-[18ch] text-[2.15rem] leading-[1.05] text-tortilla sm:text-5xl md:text-[4.35rem]">
          Un rico sabor
        </h1>
        <p className="mt-4 max-w-xl text-xl text-tortilla/90 md:text-2xl">
          para un excelente día
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
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
