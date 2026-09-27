import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useReviews } from "@/context/ReviewsContext";
import { Reveal } from "@/components/Reveal";

/** Estrellas con fracciones (ej. 4.8 llena 4 completas y ~80% de la quinta). */
export function StarRating({ rating, label, size = 16 }: { rating: number; label?: string; size?: number }) {
  const clamped = Math.min(5, Math.max(0, rating));

  return (
    <p className="flex items-center gap-0.5" aria-label={label ?? `${clamped.toFixed(1)} de 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(1, Math.max(0, clamped - index));
        return (
          <span key={index} className="relative inline-block shrink-0" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-clay" aria-hidden strokeWidth={1.75} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }} aria-hidden>
              <Star size={size} className="fill-gold text-gold" strokeWidth={1.75} />
            </span>
          </span>
        );
      })}
    </p>
  );
}

export function ReviewsSection() {
  const { visibleReviews } = useReviews();
  const [emblaRef, embla] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const average =
    visibleReviews.length === 0
      ? 0
      : visibleReviews.reduce((sum, review) => sum + review.rating, 0) / visibleReviews.length;

  return (
    <section id="resenas" className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-4xl text-ink md:text-5xl">Lo que opinan quienes ya comieron</h2>
              <span className="mark" aria-hidden />
              {visibleReviews.length > 0 ? (
                <p className="mt-5 flex flex-wrap items-center gap-3 text-sm text-clay">
                  <StarRating rating={average} size={18} label={`Promedio ${average.toFixed(1)} de 5`} />
                  <span>
                    {average.toFixed(1)} · {visibleReviews.length}{" "}
                    {visibleReviews.length === 1 ? "opinión" : "opiniones"}
                  </span>
                </p>
              ) : null}
            </div>
            {visibleReviews.length > 1 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Opinión anterior"
                  onClick={() => embla?.scrollPrev()}
                  className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Opinión siguiente"
                  onClick={() => embla?.scrollNext()}
                  className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : null}
          </div>
        </Reveal>

        {visibleReviews.length === 0 ? (
          <p className="mt-10 text-clay">Pronto verás aquí las opiniones del local.</p>
        ) : (
          <div className="mt-10 overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {visibleReviews.map((review) => (
                <article
                  key={review.id}
                  className="mr-5 min-w-0 flex-[0_0_85%] border-t border-ink/15 pt-6 sm:flex-[0_0_48%] lg:mr-8 lg:flex-[0_0_31%]"
                >
                  <StarRating rating={review.rating} />
                  <p className="mt-4 text-lg leading-snug text-ink">{review.text}</p>
                  <p className="mt-6 text-sm font-medium text-ink">{review.author}</p>
                  <p className="text-sm text-clay">
                    {new Date(`${review.publishedAt}T12:00:00`).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "long",
                    })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
