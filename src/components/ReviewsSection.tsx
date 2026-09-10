import { Star } from "lucide-react";
import { useReviews } from "@/context/ReviewsContext";
import { Reveal } from "@/components/Reveal";

export function StarRating({ rating, label }: { rating: number; label?: string }) {
  return (
    <p className="flex items-center gap-0.5" aria-label={label ?? `${rating} de 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < rating;
        return (
          <Star
            key={index}
            size={16}
            className={filled ? "fill-gold text-gold" : "text-clay"}
            aria-hidden
          />
        );
      })}
    </p>
  );
}

export function ReviewsSection() {
  const { visibleReviews } = useReviews();
  const average =
    visibleReviews.length === 0
      ? 0
      : visibleReviews.reduce((sum, review) => sum + review.rating, 0) / visibleReviews.length;

  return (
    <section id="resenas" className="px-4 py-24 md:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="font-display text-4xl text-ink md:text-5xl">Lo que opinan quienes ya comieron</h2>
          <span className="mark" aria-hidden />
          <p className="mt-5 max-w-[65ch] text-clay">
            Reseñas de ejemplo, con calificación de 1 a 5. Las editamos desde el panel de admin y las cambiamos por
            comentarios reales del local cuando estén listos.
          </p>
          {visibleReviews.length > 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-clay">
              <StarRating rating={Math.round(average)} label={`Promedio ${average.toFixed(1)} de 5`} />
              <span>
                {average.toFixed(1)} · {visibleReviews.length}{" "}
                {visibleReviews.length === 1 ? "reseña" : "reseñas"}
              </span>
            </p>
          ) : null}
        </Reveal>

        {visibleReviews.length === 0 ? (
          <p className="mt-10 text-clay">Aún no hay reseñas visibles.</p>
        ) : (
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {visibleReviews.map((review) => (
              <article key={review.id} className="flex h-full flex-col border-t border-ink/15 pt-6">
                <StarRating rating={review.rating} />
                <p className="mt-4 flex-1 text-lg leading-snug text-ink">{review.text}</p>
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
        )}
      </div>
    </section>
  );
}
