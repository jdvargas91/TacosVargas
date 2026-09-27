import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

export function KitchenCrew() {
  const { kitchen } = useSiteContent();

  return (
    <section id="cocina" className="kitchen-heat text-tortilla">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-28">
        <Reveal>
          <h2 className="font-display max-w-xl text-4xl leading-[1.05] md:text-5xl">{kitchen.headline}</h2>
          <span className="mark" aria-hidden />
          <p className="mt-5 max-w-[65ch] text-lg text-tortilla/90">{kitchen.lede}</p>
        </Reveal>

        <ul className="mt-16 flex flex-col gap-20 md:mt-24 md:gap-28">
          {kitchen.people.map((person, index) => {
            const reverse = index % 2 === 1;
            const featured = index === 0;

            return (
              <li key={person.name}>
                <Reveal delay={0.05}>
                  <article
                    className={`grid items-start gap-6 lg:items-center lg:gap-14 ${
                      featured ? "lg:grid-cols-[1.25fr_0.75fr]" : "lg:grid-cols-[0.92fr_1.08fr]"
                    }`}
                  >
                    <figure
                      className={`kitchen-frame ${reverse ? "lg:order-2" : ""} ${
                        featured ? "aspect-[5/4]" : "aspect-[4/5] max-lg:aspect-[5/4]"
                      }`}
                    >
                      <img
                        src={person.image}
                        alt={person.imageAlt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </figure>
                    <div className={reverse ? "lg:order-1" : ""}>
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
    </section>
  );
}
