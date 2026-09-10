import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
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
  const { user, signOut } = useAuth();
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const home = location.pathname === "/";
  const solid = !home || scrolled || open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const navClass = solid
    ? "text-sm font-medium text-clay transition hover:text-ink"
    : "text-sm font-medium text-tortilla/90 transition hover:text-tortilla";

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
          <a href={home ? "#inicio" : "/#inicio"} className="shrink-0">
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
            {user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <NavLink to="/mis-pedidos" className={`rounded-full px-3 py-2 text-sm ${solid ? "text-clay hover:text-ink" : "text-tortilla/90 hover:text-tortilla"}`}>
                  Mis pedidos
                </NavLink>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className={`rounded-full px-3 py-2 text-sm ${solid ? "text-clay hover:text-ink" : "text-tortilla/90 hover:text-tortilla"}`}
                >
                  Salir
                </button>
              </div>
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
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="border-t border-ink/10 bg-paper px-4 py-4 xl:hidden">
            <div className="flex flex-col gap-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 text-ink"
                >
                  {link.label}
                </a>
              ))}
              {user ? (
                <>
                  <NavLink to="/mis-pedidos" onClick={() => setOpen(false)} className="py-2">
                    Mis pedidos
                  </NavLink>
                  <button type="button" className="py-2 text-left" onClick={() => void signOut()}>
                    Salir
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
