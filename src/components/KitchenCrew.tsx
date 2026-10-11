import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

export function KitchenCrew() {
  const { kitchen } = useSiteContent();
  const reduce = useReducedMotion();

  return (
    <section id="cocina" className="kitchen-heat text-tortilla">
      <img className="section-wave" src="/team-wave-top.svg" alt="" />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6 md:pb-20 md:pt-12">
        <Reveal>
          <h2 className="font-display text-4xl md:text-5xl">{kitchen.headline}</h2>
          <span className="mark" aria-hidden />
          <p className="mt-5 max-w-[65ch] text-lg text-tortilla/90">{kitchen.lede}</p>
        </Reveal>

        <ul className="mt-16 flex flex-col gap-20 md:mt-24 md:gap-28">
          {kitchen.people.map((person, index) => {
            const reverse = index % 2 === 1;
            const featured = index === 0;

            return (
              <li key={person.name}>
                <Reveal delay={0.05 * index}>
                  <article
                    className={`flex flex-col items-start gap-6 lg:items-center lg:gap-14 ${
                      reverse ? "lg:flex-row-reverse" : "lg:flex-row"
                    }`}
                  >
                    <motion.figure
                      className="kitchen-frame shrink-0"
                      whileHover={reduce ? undefined : { scale: 1.015 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <img
                        src={person.image}
                        alt={person.imageAlt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </motion.figure>
                    <div>
                      <h3
                        className={`font-display leading-[1.05] ${
                          featured ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
                        }`}
                      >
                        {person.name}
                      </h3>
                      <p className="mt-3 text-base font-semibold text-gold">{person.role}</p>
                      <p className="mt-4 max-w-[42ch] text-base text-tortilla/90 md:text-lg">{person.station}</p>
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
      <img className="section-wave" src="/team-wave-bottom.svg" alt="" />
    </section>
  );
}
