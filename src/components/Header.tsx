import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogIn, Menu, ShoppingBag, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GoogleGateModal } from "@/components/GoogleGateModal";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const links = [
  { href: "/#inicio", id: "inicio", label: "Inicio" },
  { href: "/#quienes-somos", id: "quienes-somos", label: "Quiénes somos" },
  { href: "/#menu", id: "menu", label: "Menú" },
  { href: "/#cocina", id: "cocina", label: "Cocina" },
  { href: "/#galeria", id: "galeria", label: "Galería" },
  { href: "/#resenas", id: "resenas", label: "Reseñas" },
  { href: "/#ubicacion", id: "ubicacion", label: "Ubicación" },
];

export function Header() {
  const { user, isStaff, signOut, signInGoogle, loading, configured } = useAuth();
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSection, setVisibleSection] = useState("inicio");
  const location = useLocation();
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const home = location.pathname === "/";
  const solid = !home || scrolled || open;
  const showLogo = !home || scrolled;

  const authLinkClass = solid
    ? "cursor-pointer rounded-full px-3 py-2 text-sm text-carbon hover:text-ink hover:underline"
    : "cursor-pointer rounded-full px-3 py-2 text-sm text-tortilla/90 hover:text-tortilla hover:underline";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    const root = document.getElementById("root");
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("nav-open");
    root?.setAttribute("aria-hidden", "true");
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove("nav-open");
      root?.removeAttribute("aria-hidden");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const navClass = solid
    ? "cursor-pointer text-sm font-medium text-carbon transition hover:text-ink hover:underline"
    : "cursor-pointer text-sm font-medium text-tortilla/90 transition hover:text-tortilla hover:underline";

  const activeSection = location.pathname.startsWith("/producto") ? "menu" : home ? visibleSection : null;

  useEffect(() => {
    if (!home) return;
    const fromHash = location.hash.replace("#", "");
    if (fromHash) setVisibleSection(fromHash);

    const mark = () => {
      const line = 120;
      const sections = links
        .map((link) => ({ id: link.id, node: document.getElementById(link.id) }))
        .filter((item): item is { id: string; node: HTMLElement } => item.node !== null)
        .sort((a, b) => a.node.offsetTop - b.node.offsetTop);
      let current = sections[0]?.id ?? "inicio";
      for (const section of sections) {
        if (section.node.getBoundingClientRect().top <= line) current = section.id;
      }
      setVisibleSection(current);
    };

    mark();
    window.addEventListener("scroll", mark, { passive: true });
    return () => window.removeEventListener("scroll", mark);
  }, [home, location.hash]);

  function sectionClass(id: string, mobile = false) {
    const current = id === activeSection;
    if (mobile) {
      return `cursor-pointer py-3 text-left text-lg text-ink hover:underline ${current ? "font-semibold underline decoration-terracotta decoration-2 underline-offset-4" : ""}`;
    }
    return `${navClass} ${current ? "font-semibold underline decoration-terracotta decoration-2 underline-offset-8" : ""}`;
  }

  const redirectAfterLogin = `${window.location.origin}/cuenta`;

  async function handleLogin() {
    setLoginError(null);
    if (!configured) {
      setLoginError("Falta configurar Supabase en el archivo .env.");
      return;
    }
    setLoginBusy(true);
    try {
      const returnTo = location.pathname.startsWith("/pedido")
        ? "/pedido"
        : location.pathname === "/mis-pedidos"
          ? "/mis-pedidos"
          : "/cuenta";
      sessionStorage.setItem("vargas_post_login", returnTo);
      await signInGoogle(redirectAfterLogin);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar sesión con Google.";
      if (/provider is not enabled/i.test(message)) {
        setLoginError(
          "Google no está habilitado en Supabase. En Authentication → Providers → Google: actívalo, pega Client ID y Secret, y guarda.",
        );
      } else if (/Supabase no está configurado/i.test(message)) {
        setLoginError("Falta configurar Supabase en el archivo .env.");
      } else {
        setLoginError(message);
      }
      setLoginBusy(false);
    }
  }

  const drawer = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] md:hidden"
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-carbon/40"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            id="menu-movil"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 right-0 flex h-dvh w-[85%] flex-col bg-paper shadow-[-18px_0_40px_rgb(30_23_16_/_0.22)]"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <a
                id={titleId}
                href={home ? "#inicio" : "/#inicio"}
                onClick={() => setOpen(false)}
                className="shrink-0"
              >
                <BrandLogo />
              </a>
              <button
                ref={closeRef}
                type="button"
                className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6" aria-label="Principal">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={link.id === activeSection ? "true" : undefined}
                  onClick={() => {
                    setVisibleSection(link.id);
                    setOpen(false);
                  }}
                  className={sectionClass(link.id, true)}
                >
                  {link.label}
                </a>
              ))}
              {user ? (
                <>
                  {!isStaff ? (
                    <NavLink to="/mis-pedidos" onClick={() => setOpen(false)} className="cursor-pointer py-3 text-lg hover:underline">
                      Mis pedidos
                    </NavLink>
                  ) : (
                    <NavLink to="/sistema" onClick={() => setOpen(false)} className="cursor-pointer py-3 text-lg hover:underline">
                      Sistema
                    </NavLink>
                  )}
                  <button type="button" className="cursor-pointer py-3 text-left text-lg hover:underline" onClick={() => void signOut()}>
                    Salir
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="cursor-pointer py-3 text-left text-lg text-ink hover:underline"
                  onClick={() => {
                    setOpen(false);
                    setLoginError(null);
                    setLoginOpen(true);
                  }}
                >
                  Iniciar sesión
                </button>
              )}
            </nav>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${solid
          ? "border-b border-ink/10 bg-paper/55 shadow-[0_8px_24px_rgb(30_23_16_/_0.06)] backdrop-blur-[8px]"
          : "border-b border-transparent bg-transparent"
          }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <a
            href={home ? "#inicio" : "/#inicio"}
            className={`shrink-0 overflow-hidden transition-[opacity,transform,max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${showLogo
              ? "max-w-[9rem] translate-y-0 opacity-100"
              : "pointer-events-none max-w-0 -translate-y-1 opacity-0"
              }`}
            aria-label="Vargas Tacos"
            aria-hidden={!showLogo}
            tabIndex={showLogo ? undefined : -1}
          >
            <BrandLogo />
          </a>

          <nav className="hidden items-center gap-4 text-[0.8125rem] md:flex lg:gap-5 lg:text-sm xl:gap-6" aria-label="Principal">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={link.id === activeSection ? "true" : undefined}
                onClick={() => setVisibleSection(link.id)}
                className={sectionClass(link.id)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!loading && user ? (
              <div className="hidden items-center gap-2 sm:flex">
                {!isStaff ? (
                  <NavLink to="/mis-pedidos" className={authLinkClass}>
                    Mis pedidos
                  </NavLink>
                ) : (
                  <NavLink to="/sistema" className={authLinkClass}>
                    Sistema
                  </NavLink>
                )}
                <button type="button" onClick={() => void signOut()} className={authLinkClass}>
                  Salir
                </button>
              </div>
            ) : null}
            {!loading && !user ? (
              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setLoginOpen(true);
                }}
                className={`hidden items-center gap-2 sm:inline-flex ${authLinkClass}`}
              >
                <LogIn size={16} aria-hidden />
                Iniciar sesión
              </button>
            ) : null}
            <Link
              to="/pedido"
              className="btn-accent h-11 min-w-11 px-3 text-sm md:px-4"
              aria-label={totalItems > 0 ? `Pedido · ${totalItems}` : "Pedido"}
            >
              <ShoppingBag size={16} aria-hidden />
              <span className="tabular-nums md:hidden">{totalItems > 0 ? totalItems : ""}</span>
              <span className="hidden md:inline">Pedido{totalItems > 0 ? ` · ${totalItems}` : ""}</span>
            </Link>
            <button
              type="button"
              className={`grid h-11 w-11 place-items-center rounded-full md:hidden ${solid ? "border border-ink/15 text-ink" : "border border-tortilla/40 text-tortilla"
                }`}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>
      {createPortal(drawer, document.body)}
      <GoogleGateModal
        open={loginOpen}
        title="Tu cuenta Vargas"
        body="Entra con Google para pedir, guardar tu historial y ver el estado de tus órdenes. El sitio público se sigue viendo sin cuenta."
        error={loginError}
        onClose={() => {
          setLoginOpen(false);
          setLoginError(null);
          setLoginBusy(false);
        }}
        onConfirm={() => {
          if (!loginBusy) void handleLogin();
        }}
      />
    </>
  );
}
