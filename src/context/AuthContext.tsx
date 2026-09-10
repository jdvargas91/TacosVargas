import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  isStaff: boolean;
  signInGoogle: (redirectTo: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;

    async function sync(nextUser: User | null) {
      setUser(nextUser);
      if (!nextUser) {
        setIsStaff(false);
        setLoading(false);
        return;
      }
      const { data } = await client.from("staff").select("user_id").eq("user_id", nextUser.id).maybeSingle();
      setIsStaff(Boolean(data));
      setLoading(false);
    }

    client.auth.getSession().then(({ data }) => {
      void sync(data.session?.user ?? null);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void sync(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: supabaseConfigured,
      loading,
      user,
      isStaff,
      signInGoogle: async (redirectTo: string) => {
        if (!supabase) throw new Error("Supabase no está configurado");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [isStaff, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
