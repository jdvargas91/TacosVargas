import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

export function About() {
  const { about } = useSiteContent();

  return (
    <section id="quienes-somos" className="surface-grain overflow-x-clip px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <h2 className="font-display text-4xl text-ink md:text-5xl">{about.headline}</h2>
            <span className="mark" aria-hidden />
            <div className="mt-6 max-w-[65ch] space-y-4 text-clay">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <figure className="about-portrait mx-auto">
              <img
                className="about-portrait__blob"
                src="/figura-blob.svg"
                alt=""
                aria-hidden
                decoding="async"
              />
              <img className="about-portrait__photo" src={about.image} alt="Especialidad de Vargas Tacos" />
            </figure>
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-8 border-y border-ink/10 py-10 sm:grid-cols-3 sm:gap-6 md:mt-20">
          {about.pillars.map((pillar, index) => (
            <Reveal key={pillar.title} as="li" delay={index * 0.08} className="max-w-[28ch]">
              <p className="font-display text-2xl text-ink">{pillar.title}</p>
              <p className="mt-2 text-sm text-clay">{pillar.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
