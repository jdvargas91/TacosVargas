import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useReviews } from "@/context/ReviewsContext";
import { useToast } from "@/context/ToastContext";
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

const ratingOptions = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} estrella${n === 1 ? "" : "s"}`,
}));

export function ReviewsAdmin() {
  const { reviews, upsert, remove } = useReviews();
  const toast = useToast();
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
    if (!draft.author.trim() || !draft.text.trim()) {
      toast.error("Revisa la opinión", "Autor y texto son obligatorios.");
      return;
    }
    setError(null);
    const wasEdit = Boolean(editingId);
    try {
      await upsert({
        ...draft,
        author: draft.author.trim(),
        text: draft.text.trim(),
        rating: Math.min(5, Math.max(1, Number(draft.rating) || 5)),
      });
      toast.success(
        wasEdit ? "Opinión actualizada" : "Opinión creada",
        wasEdit ? "Los cambios ya están guardados." : "La opinión se agregó correctamente.",
      );
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      setError(msg);
      toast.error(wasEdit ? "Opinión no actualizada" : "Opinión no creada", msg);
    }
  }

  return (
    <div className="mt-2 space-y-8">
      {error ? <p className="text-terracotta">{error}</p> : null}

      <form
        className="card-shadow grid gap-4 rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="font-display text-2xl text-ink">{editingId ? "Editar opinión" : "Nueva opinión"}</h2>

        <label className="text-sm text-clay">
          <FieldLabel required>Autor</FieldLabel>
          <input
            value={draft.author}
            onChange={(event) => setDraft({ ...draft, author: event.target.value })}
            className="mt-2 h-11 w-full rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-clay">
            <FieldLabel required>Puntuación</FieldLabel>
            <Select
              className="mt-2"
              value={String(draft.rating)}
              onValueChange={(v) => setDraft({ ...draft, rating: Number(v) })}
              options={ratingOptions}
              aria-label="Puntuación de 1 a 5"
            />
          </label>
          <label className="text-sm text-clay">
            <FieldLabel required>Fecha</FieldLabel>
            <DateField
              className="mt-2"
              value={draft.publishedAt}
              onChange={(publishedAt) => setDraft({ ...draft, publishedAt })}
            />
          </label>
        </div>

        <label className="text-sm text-clay">
          <FieldLabel required>Comentario</FieldLabel>
          <textarea
            value={draft.text}
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            className="mt-2 min-h-24 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
            required
          />
        </label>

        <Switch
          checked={draft.visible}
          onCheckedChange={(visible) => setDraft({ ...draft, visible })}
          label="Visible en el sitio"
          description="Si está apagado, la opinión no aparece en la página pública."
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={reset} className="btn-secondary h-11 px-5 text-sm">
            <X size={16} aria-hidden />
            Cancelar
          </button>
          <button type="submit" className="btn-accent h-11 px-5">
            {editingId ? <Save size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
            {editingId ? "Guardar cambios" : "Publicar"}
          </button>
        </div>
      </form>

      <ul className="space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="card-shadow rounded-[10px] border border-ink/8 bg-smoke p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl text-ink">{review.author}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-clay">
                  <span className="inline-flex items-center gap-1 font-medium text-ink">
                    <Star size={14} className="fill-gold text-gold" aria-hidden />
                    {review.rating} de 5
                  </span>
                  <span className="text-ink/25">·</span>
                  {review.publishedAt}
                  <span className="text-ink/25">·</span>
                  {review.visible ? "Visible" : "Oculta"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => startEdit(review)} className="btn-secondary h-11 px-4 text-sm">
                  <Pencil size={16} aria-hidden />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void upsert({ ...review, visible: !review.visible })}
                  className="btn-secondary h-11 px-4 text-sm"
                >
                  {review.visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  {review.visible ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        await remove(review.id);
                        toast.success("Opinión eliminada", `Se quitó la opinión de ${review.author}.`);
                      } catch (err) {
                        toast.error(
                          "Opinión no eliminada",
                          err instanceof Error ? err.message : "No se pudo borrar",
                        );
                      }
                    })();
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-terracotta/35 px-4 text-sm font-medium text-terracotta"
                >
                  <Trash2 size={16} aria-hidden />
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
