import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

export function About() {
  const { about } = useSiteContent();

  return (
    <section id="quienes-somos" className="surface-grain overflow-x-clip px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <h2 className="font-display max-w-xl text-4xl text-ink md:text-5xl">{about.headline}</h2>
            <span className="mark" aria-hidden />
            <div className="mt-6 max-w-[65ch] space-y-4 text-clay">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <figure className="about-diamond mx-auto">
              <div className="about-diamond__back" aria-hidden />
              <div className="about-diamond__front">
                <img src={about.image} alt="Especialidad de Vargas Tacos" />
              </div>
            </figure>
          </Reveal>
        </div>

        <Reveal delay={0.06} className="mt-16 md:mt-20">
          <ul className="grid gap-8 border-y border-ink/10 py-10 sm:grid-cols-3 sm:gap-6">
            {about.pillars.map((pillar) => (
              <li key={pillar.title} className="max-w-[28ch]">
                <p className="font-display text-2xl text-ink">{pillar.title}</p>
                <p className="mt-2 text-sm text-clay">{pillar.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 md:mt-16">
          <ul className="grid gap-12 md:grid-cols-2 md:gap-16">
            {about.values.map((value) => (
              <li key={value.title} className="max-w-[54ch]">
                <h3 className="font-display text-3xl text-ink">{value.title}</h3>
                <span className="mark" aria-hidden />
                <p className="mt-4 text-clay">{value.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
