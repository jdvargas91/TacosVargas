import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { GoogleGateModal } from "@/components/GoogleGateModal";

export function RequireAuth({
  children,
  title = "Entra con Google",
  body = "Necesitas una cuenta para continuar.",
  redirectTo,
}: {
  children: ReactNode;
  title?: string;
  body?: string;
  redirectTo?: string;
}) {
  const { user, loading, signInGoogle } = useAuth();
  const location = useLocation();
  const target = redirectTo ?? `${window.location.origin}${location.pathname}`;

  if (loading) {
    return (
      <main className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
        <p className="text-clay">Cargando…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <>
        <main className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
          <p className="text-clay">Inicia sesión para continuar.</p>
        </main>
        <GoogleGateModal
          open
          title={title}
          body={body}
          onClose={() => {
            window.location.href = "/";
          }}
          onConfirm={() => {
            void signInGoogle(target);
          }}
        />
      </>
    );
  }

  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
  fallback = "/",
}: {
  roles: UserRole[];
  children: ReactNode;
  fallback?: string;
}) {
  const { user, loading, role, isStaff } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto min-h-svh max-w-6xl px-4 pb-20 pt-28">
        <p className="text-clay">Cargando…</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(role)) {
    if (isStaff) return <Navigate to="/sistema" replace />;
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
