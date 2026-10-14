import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

/** Misma curva que el trazo SVG: alta en los extremos y baja en el centro. */
const ROPE_START = 6;
const ROPE_DIP = 96;
const ROPE_VIEW = 58;
const ROPE_DROP = "8.5rem";

function ropeDrop(t: number) {
  const y = (1 - t) ** 2 * ROPE_START + 2 * (1 - t) * t * ROPE_DIP + t ** 2 * ROPE_START;
  return (y - ROPE_START) / ROPE_VIEW;
}

const GALLERY_LIMIT = 6;

export function Gallery() {
  const { gallery } = useSiteContent();
  const reduce = useReducedMotion();
  const shots = gallery.shots.filter((shot) => shot.src).slice(0, GALLERY_LIMIT);

  return (
    <section id="galeria" className="gallery-section">
      <img className="section-wave" src="/gallery-wave-top.svg" alt="" loading="lazy" decoding="async" />
      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-6 md:pt-12">
        <Reveal>
          <h2 className="font-display text-4xl text-white md:text-5xl">{gallery.headline}</h2>
          <span className="mark" aria-hidden />
        </Reveal>
      </div>

      {shots.length > 0 ? (
        <div className="clothesline">
          <div className="clothesline__track">
            <svg className="clothesline__rope" viewBox={`0 0 100 ${ROPE_VIEW}`} preserveAspectRatio="none" aria-hidden>
              <path
                d={`M0 ${ROPE_START} Q50 ${ROPE_DIP} 100 ${ROPE_START}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <ul className="clothesline__row">
              {shots.map((shot, index) => {
                const count = shots.length;
                const t = count === 1 ? 0.5 : index / (count - 1);
                const tilt = (t - 0.5) * 12 + (index % 2 === 0 ? -2 : 2);
                return (
                  <motion.li
                    key={shot.src + shot.alt}
                    className="clothesline__item"
                    style={
                      {
                        "--tilt": `${tilt}deg`,
                        marginTop: `calc(${ropeDrop(t)} * ${ROPE_DROP})`,
                      } as CSSProperties
                    }
                    initial={reduce ? false : { opacity: 0, y: 26 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                    transition={{
                      duration: 0.6,
                      delay: Math.min(index * 0.07, 0.35),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className="clothesline__clip" aria-hidden />
                    <figure className="clothesline__card">
                      <img src={shot.src} alt={shot.alt} loading="lazy" decoding="async" />
                      <div className="clothesline__blank" aria-hidden />
                    </figure>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
      <img className="section-wave" src="/gallery-wave-bottom.svg" alt="" loading="lazy" decoding="async" />
    </section>
  );
}
