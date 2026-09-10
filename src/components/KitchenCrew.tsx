import { kitchenCrew } from "@/data/kitchen";
import { Reveal } from "@/components/Reveal";

export function KitchenCrew() {
  return (
    <section id="cocina" className="from-carbon to-carbon/50" style={{ background: "#ff572214" }}>
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6">
        <Reveal>
          <h2 className="font-display max-w-xl text-4xl leading-[1.05] text-ink md:text-5xl">
            {kitchenCrew.headline}
          </h2>
          <span className="mark" aria-hidden />
          <p className="mt-5 max-w-[65ch] text-lg text-ink/90">{kitchenCrew.lede}</p>
        </Reveal>

        <ul className="mt-14 grid gap-3 md:grid-cols-3 md:gap-2">
          {kitchenCrew.people.map((person, index) => (
            <li key={person.name}>
              <Reveal delay={0.08 * index} className="h-full">
                <article className="group relative h-full min-h-[22rem] overflow-hidden rounded-2xl md:min-h-[32rem]">
                  <img
                    src={person.image}
                    alt={person.imageAlt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-carbon/25 to-transparent" />
                  <div className="relative flex h-full min-h-[22rem] flex-col justify-end p-6 md:min-h-[32rem] md:p-7">
                    <h3 className="font-display text-3xl leading-[1.05] text-tortilla">{person.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-gold">{person.role}</p>
                    <p className="mt-3 max-w-[36ch] text-sm text-tortilla/85">{person.station}</p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
