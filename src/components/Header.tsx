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
  { href: "/#inicio", label: "Inicio" },
  { href: "/#quienes-somos", label: "Quiénes somos" },
  { href: "/#cocina", label: "Cocina" },
  { href: "/#menu", label: "Menú" },
  { href: "/#resenas", label: "Reseñas" },
  { href: "/#galeria", label: "Galería" },
  { href: "/#ubicacion", label: "Ubicación" },
];

export function Header() {
  const { user, isStaff, signOut, signInGoogle, loading } = useAuth();
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const home = location.pathname === "/";
  const solid = !home || scrolled || open;
  const hideBrand = home && !scrolled && !open;

  const authLinkClass = solid
    ? "rounded-full px-3 py-2 text-sm text-clay hover:text-ink"
    : "rounded-full px-3 py-2 text-sm text-tortilla/90 hover:text-tortilla";

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
    const media = window.matchMedia("(min-width: 1280px)");
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
    ? "text-sm font-medium text-clay transition hover:text-ink"
    : "text-sm font-medium text-tortilla/90 transition hover:text-tortilla";

  const redirectAfterLogin = `${window.location.origin}/cuenta`;

  const drawer = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] xl:hidden"
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
                  onClick={() => setOpen(false)}
                  className="py-3 text-lg text-ink"
                >
                  {link.label}
                </a>
              ))}
              {user ? (
                <>
                  {!isStaff ? (
                    <NavLink to="/mis-pedidos" onClick={() => setOpen(false)} className="py-3 text-lg">
                      Mis pedidos
                    </NavLink>
                  ) : (
                    <NavLink to="/sistema" onClick={() => setOpen(false)} className="py-3 text-lg">
                      Sistema
                    </NavLink>
                  )}
                  <button type="button" className="py-3 text-left text-lg" onClick={() => void signOut()}>
                    Salir
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="py-3 text-left text-lg text-ink"
                  onClick={() => {
                    setOpen(false);
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
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300 ${
          solid
            ? "border-b border-ink/10 bg-paper/92 shadow-[0_8px_24px_rgb(30_23_16_/_0.08)] backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <a
            href={home ? "#inicio" : "/#inicio"}
            className={`shrink-0 transition-opacity duration-300 ${
              hideBrand
                ? "pointer-events-none opacity-0 max-md:w-0 max-md:min-w-0 max-md:overflow-hidden"
                : "opacity-100"
            }`}
            aria-hidden={hideBrand}
            aria-label={hideBrand ? undefined : "Vargas Tacos"}
            tabIndex={hideBrand ? -1 : undefined}
            inert={hideBrand || undefined}
          >
            <BrandLogo />
          </a>

          <nav className="hidden items-center gap-6 xl:flex" aria-label="Principal">
            {links.map((link) => (
              <a key={link.href} href={link.href} className={navClass}>
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
                onClick={() => setLoginOpen(true)}
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
              className={`grid h-11 w-11 place-items-center rounded-full xl:hidden ${
                solid ? "border border-ink/15 text-ink" : "border border-tortilla/40 text-tortilla"
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
        onClose={() => setLoginOpen(false)}
        onConfirm={() => {
          void signInGoogle(redirectAfterLogin);
        }}
      />
    </>
  );
}
