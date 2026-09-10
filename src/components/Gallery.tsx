import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const shots = [
  {
    src: "/gallery/plancha.jpg",
    alt: "Tacos en la plancha, fotografía de referencia",
    className: "md:col-start-1 md:row-start-1 md:row-span-2",
  },
  {
    src: "/products/camaron.jpg",
    alt: "Taco de camarón capeado",
    className: "md:col-start-2 md:col-span-2 md:row-start-1",
  },
  {
    src: "/products/barbacoa.jpg",
    alt: "Taco de barbacoa",
    className: "md:col-start-2 md:row-start-2",
  },
  {
    src: "/products/bistec.jpg",
    alt: "Taco de bistec de arrachera",
    className: "md:col-start-3 md:row-start-2",
  },
  {
    src: "/products/adobada.jpg",
    alt: "Taco de adobada de cerdo",
    className: "md:col-start-1 md:row-start-3",
  },
  {
    src: "/about.jpg",
    alt: "Tacos al vapor, fotografía de referencia",
    className: "md:col-start-2 md:col-span-2 md:row-start-3",
  },
];

export function Gallery() {
  const reduce = useReducedMotion();
  const bandRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: bandRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-22%", "22%"]);

  return (
    <section id="galeria" className="bg-carbon text-tortilla">
      <div ref={bandRef} className="parallax-band">
        <motion.img
          src="/about.jpg"
          alt=""
          aria-hidden
          className="parallax-band__media"
          style={{ y: reduce ? 0 : y }}
        />
        <div className="parallax-band__veil" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-24 md:px-6 md:py-32">
          <h2 className="font-display max-w-3xl text-4xl leading-[1.05] text-tortilla md:text-6xl">
            El primer bocado
          </h2>
          <span className="mark" aria-hidden />
          <p className="mt-5 max-w-[65ch] text-lg text-tortilla/90">
            Fotos de referencia hasta que tengamos las del local. El menú impreso sí es el de Vargas Tacos.
          </p>
        </div>
      </div>

      <div className="px-3 pb-10 pt-3 md:px-4 md:pb-14">
        <div className="mx-auto grid max-w-[88rem] grid-flow-dense grid-cols-2 auto-rows-[minmax(11.5rem,28vw)] gap-2 sm:gap-3 md:h-[min(86vh,840px)] md:grid-cols-3 md:grid-rows-3 md:auto-rows-fr">
          {shots.map((shot) => (
            <div key={shot.src} className={`relative min-h-[11.5rem] overflow-hidden rounded-2xl ${shot.className}`}>
              <img src={shot.src} alt={shot.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
