import { useState } from "react";
import { useReviews } from "@/context/ReviewsContext";
import type { Review } from "@/data/reviews";

function emptyReview(): Review {
  return {
    id: `rev-${Date.now()}`,
    author: "",
    rating: 5,
    text: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    visible: true,
  };
}

export function ReviewsAdmin() {
  const { reviews, upsert, remove } = useReviews();
  const [draft, setDraft] = useState<Review>(emptyReview());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(review: Review) {
    setEditingId(review.id);
    setDraft(review);
  }

  function reset() {
    setEditingId(null);
    setDraft(emptyReview());
  }

  async function submit() {
    if (!draft.author.trim() || !draft.text.trim()) return;
    setError(null);
    try {
      await upsert({
        ...draft,
        author: draft.author.trim(),
        text: draft.text.trim(),
        rating: Math.min(5, Math.max(1, Number(draft.rating) || 5)),
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <div className="mt-8">
      <p className="max-w-prose text-clay">
        Reseñas visibles en la página pública. Se guardan en Supabase para todos los dispositivos.
      </p>
      {error ? <p className="mt-3 text-terracotta">{error}</p> : null}

      <form
        className="card-shadow mt-6 grid gap-3 rounded-2xl bg-smoke p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="font-display text-2xl text-ink">{editingId ? "Editar reseña" : "Nueva reseña"}</h2>
        <label className="text-sm text-clay">
          Autor
          <input
            value={draft.author}
            onChange={(event) => setDraft({ ...draft, author: event.target.value })}
            className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
            required
          />
        </label>
        <label className="text-sm text-clay">
          Puntuación (1–5)
          <input
            type="number"
            min={1}
            max={5}
            value={draft.rating}
            onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) })}
            className="mt-2 h-11 w-24 rounded-xl border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        <label className="text-sm text-clay">
          Comentario
          <textarea
            value={draft.text}
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            className="mt-2 min-h-24 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            required
          />
        </label>
        <label className="text-sm text-clay">
          Fecha
          <input
            type="date"
            value={draft.publishedAt}
            onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })}
            className="mt-2 h-11 rounded-xl border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-clay">
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={(event) => setDraft({ ...draft, visible: event.target.checked })}
          />
          Visible en el sitio
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-accent h-11 px-5">
            {editingId ? "Guardar cambios" : "Publicar"}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="h-11 rounded-full border border-ink/15 px-5 text-ink">
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <ul className="mt-8 space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="card-shadow rounded-2xl bg-smoke p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl text-ink">{review.author}</p>
                <p className="text-sm text-clay">
                  {review.rating} de 5 · {review.publishedAt} · {review.visible ? "Visible" : "Oculta"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(review)}
                  className="h-11 rounded-full border border-ink/15 px-4 text-ink"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void upsert({ ...review, visible: !review.visible })}
                  className="h-11 rounded-full border border-ink/15 px-4 text-ink"
                >
                  {review.visible ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(review.id)}
                  className="h-11 rounded-full border border-ink/15 px-4 text-terracotta"
                >
                  Borrar
                </button>
              </div>
            </div>
            <p className="mt-3 text-ink">{review.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
