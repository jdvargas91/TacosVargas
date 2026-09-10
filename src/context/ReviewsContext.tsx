import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedReviews, type Review } from "@/data/reviews";

const STORAGE_KEY = "tv-reviews-v1";

type ReviewsContextValue = {
  reviews: Review[];
  visibleReviews: Review[];
  save: (reviews: Review[]) => void;
  upsert: (review: Review) => void;
  remove: (id: string) => void;
};

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

function readReviews(): Review[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedReviews;
    const parsed = JSON.parse(raw) as Review[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedReviews;
    return parsed;
  } catch {
    return seedReviews;
  }
}

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(seedReviews);

  useEffect(() => {
    setReviews(readReviews());
  }, []);

  const save = useCallback((next: Review[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReviews(next);
  }, []);

  const upsert = useCallback((review: Review) => {
    setReviews((current) => {
      const exists = current.some((item) => item.id === review.id);
      const next = exists ? current.map((item) => (item.id === review.id ? review : item)) : [review, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setReviews((current) => {
      const next = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      reviews,
      visibleReviews: reviews.filter((review) => review.visible),
      save,
      upsert,
      remove,
    }),
    [remove, reviews, save, upsert],
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews debe usarse dentro de ReviewsProvider");
  return ctx;
}
