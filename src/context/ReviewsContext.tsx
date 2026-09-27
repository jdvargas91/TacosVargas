import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedReviews, type Review } from "@/data/reviews";
import { supabase } from "@/lib/supabase";

type ReviewsContextValue = {
  reviews: Review[];
  visibleReviews: Review[];
  loading: boolean;
  refresh: () => Promise<void>;
  save: (reviews: Review[]) => void;
  upsert: (review: Review) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

type ReviewRow = {
  id: string;
  author: string;
  rating: number;
  text: string;
  published_at: string;
  visible: boolean;
};

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    author: row.author,
    rating: row.rating,
    text: row.text,
    publishedAt: row.published_at,
    visible: row.visible,
  };
}

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [loading, setLoading] = useState(Boolean(supabase));

  const refresh = useCallback(async () => {
    if (!supabase) {
      setReviews(seedReviews);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("published_at", { ascending: false });
    if (error || !data) {
      setReviews(seedReviews);
    } else {
      setReviews((data as ReviewRow[]).map(mapReview));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsert = useCallback(
    async (review: Review) => {
      if (!supabase) {
        setReviews((current) => {
          const exists = current.some((item) => item.id === review.id);
          return exists ? current.map((item) => (item.id === review.id ? review : item)) : [review, ...current];
        });
        return;
      }
      const payload = {
        id: review.id.match(/^[0-9a-f-]{36}$/i) ? review.id : undefined,
        author: review.author,
        rating: review.rating,
        text: review.text,
        published_at: review.publishedAt,
        visible: review.visible,
        updated_at: new Date().toISOString(),
      };
      if (payload.id) {
        const { error } = await supabase.from("reviews").upsert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          author: review.author,
          rating: review.rating,
          text: review.text,
          published_at: review.publishedAt,
          visible: review.visible,
        });
        if (error) throw error;
      }
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) {
        setReviews((current) => current.filter((item) => item.id !== id));
        return;
      }
      await supabase.from("reviews").delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const save = useCallback((next: Review[]) => {
    setReviews(next);
  }, []);

  const value = useMemo(
    () => ({
      reviews,
      visibleReviews: reviews.filter((review) => review.visible),
      loading,
      refresh,
      save,
      upsert,
      remove,
    }),
    [loading, refresh, remove, reviews, save, upsert],
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews debe usarse dentro de ReviewsProvider");
  return ctx;
}
