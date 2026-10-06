import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

export function About() {
  const { about } = useSiteContent();

  return (
    <section id="quienes-somos" className="surface-grain overflow-x-clip px-4 py-24 md:px-6">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
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
              <img src={about.image} alt="Tacos en fila en Vargas Tacos" />
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
