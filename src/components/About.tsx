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
              <svg className="about-portrait__blob" viewBox="0 0 640 520" aria-hidden>
                <path
                  fill="#f8a92942"
                  d="M300 150C190 70 80 120 120 220C150 290 230 260 290 230C390 160 510 140 580 230C650 310 590 390 500 360C430 430 320 480 230 430C130 380 80 290 160 230C200 190 250 175 300 150Z"
                />
              </svg>
              <img className="about-portrait__photo" src={about.image} alt="Especialidad de Vargas Tacos" />
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
      </div>
    </section>
  );
}
