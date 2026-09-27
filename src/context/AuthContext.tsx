import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type UserRole = "cliente" | "vendedor" | "admin";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  role: UserRole;
  isStaff: boolean;
  isAdmin: boolean;
  isVendedor: boolean;
  displayName: string | null;
  signInGoogle: (redirectTo: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function roleFromProfile(value: string | null | undefined): UserRole {
  if (value === "admin" || value === "vendedor" || value === "cliente") return value;
  return "cliente";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("cliente");
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;

    async function sync(nextUser: User | null) {
      setUser(nextUser);
      if (!nextUser) {
        setRole("cliente");
        setDisplayName(null);
        setLoading(false);
        return;
      }

      const { data: claimed, error: claimError } = await client.rpc("claim_team_invite");
      if (!claimError && claimed && typeof claimed === "object" && "role" in claimed) {
        const profile = claimed as { role: string; display_name: string | null };
        setRole(roleFromProfile(profile.role));
        setDisplayName(profile.display_name);
        setLoading(false);
        return;
      }

      const { data } = await client
        .from("profiles")
        .select("role, display_name")
        .eq("user_id", nextUser.id)
        .maybeSingle();

      if (data) {
        setRole(roleFromProfile(data.role));
        setDisplayName(data.display_name);
      } else {
        // Legacy fallback while migrations roll out
        const { data: staff } = await client.from("staff").select("user_id").eq("user_id", nextUser.id).maybeSingle();
        setRole(staff ? "admin" : "cliente");
        setDisplayName(
          typeof nextUser.user_metadata.full_name === "string"
            ? nextUser.user_metadata.full_name
            : nextUser.email ?? null,
        );
      }
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

  const isStaff = role === "admin" || role === "vendedor";
  const isAdmin = role === "admin";
  const isVendedor = role === "vendedor";

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: supabaseConfigured,
      loading,
      user,
      role,
      isStaff,
      isAdmin,
      isVendedor,
      displayName,
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
    [displayName, isAdmin, isStaff, isVendedor, loading, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
