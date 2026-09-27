import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/context/AuthContext";
import { useSiteContent } from "@/context/SiteContentContext";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-.9 2.4-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.9.7-2.5 2C4.9 20.1 8.2 22.2 12 22.2c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3z"
      />
      <path
        fill="#4A90E2"
        d="M3.2 7.1C2.4 8.6 2 10.2 2 12s.4 3.4 1.2 4.9l3.4-2.6C6.2 13.4 6 12.7 6 12s.2-1.4.6-2.3L3.2 7.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.8 14.7 2 12 2 8.2 2 4.9 4.1 3.2 7.1l3.4 2.6C7 7.6 9.3 5.8 12 5.8z"
      />
    </svg>
  );
}

export function Login() {
  const { user, loading, isStaff, signInGoogle, configured, signOut } = useAuth();
  const { business } = useSiteContent();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInGoogle(`${window.location.origin}/sistema`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar sesión con Google.";
      if (/provider is not enabled/i.test(message)) {
        setError(
          "Google no está habilitado en Supabase. En Authentication → Providers → Google: activa el switch, pega Client ID y Client Secret, y pulsa Save.",
        );
      } else {
        setError(message);
      }
      setBusy(false);
    }
  }

  if (!loading && user && isStaff) {
    return <Navigate to="/sistema" replace />;
  }

  return (
    <>
      <Seo title={`Acceso · ${business.name}`} description="Acceso del equipo." noindex />
      <main
        id="contenido"
        className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgb(240 115 79 / 0.18), transparent), linear-gradient(165deg, #fff8f0 0%, #f3ebe0 45%, #ebe0d2 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e1710' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
          aria-hidden
        />

        <div className="relative w-full max-w-md">
          <div className="rounded-3xl border border-ink/10 bg-paper/95 p-8 shadow-[0_24px_60px_rgb(30_23_16_/_0.12)] backdrop-blur-sm md:p-10">
            <div className="flex flex-col items-center text-center">
              <BrandLogo className="h-14 drop-shadow-none md:h-16" />
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-clay">Panel operativo</p>
              <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">Acceso del equipo</h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-clay">
                Inicia sesión con tu cuenta de Google. El administrador define quién puede entrar al sistema.
              </p>
            </div>

            {!loading && user && !isStaff ? (
              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-ink/10 bg-smoke px-4 py-3 text-left text-sm text-clay">
                  Entraste como <span className="font-medium text-ink">{user.email}</span>, pero aún no eres
                  admin ni vendedor.
                </div>
                <p className="text-left text-sm text-clay">
                  Copia tu UUID desde Supabase → Authentication → Users y ejecuta el SQL de promoción a admin. Luego
                  vuelve a entrar.
                </p>
                <div className="flex flex-col gap-2">
                  <Link to="/mis-pedidos" className="btn-accent h-12 w-full justify-center">
                    Ir a mis pedidos
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="h-12 w-full rounded-full border border-ink/15 text-ink"
                  >
                    Salir y usar otra cuenta
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {!configured ? (
                  <p className="rounded-2xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
                    Falta configurar Supabase en el archivo .env.
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={loading || busy}
                    onClick={() => void handleGoogle()}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-white text-sm font-semibold text-ink shadow-[0_8px_20px_rgb(30_23_16_/_0.06)] transition hover:border-ink/25 hover:bg-smoke disabled:opacity-60"
                  >
                    <GoogleIcon />
                    {busy ? "Redirigiendo…" : "Continuar con Google"}
                  </button>
                )}
                {error ? (
                  <p className="rounded-2xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-left text-sm text-terracotta">
                    {error}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-clay">
            <Link to="/" className="font-medium text-ember hover:underline">
              Volver al sitio público
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
