import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ProductMediaProps = {
  src: string;
  alt: string;
  /** "card" = menú; "detail" = ficha grande; "thumb" = miniatura. */
  tone?: "card" | "detail" | "thumb";
  className?: string;
  imgClassName?: string;
  /** Foto agotada: mantiene el gris y aun así responde al hover. */
  muted?: boolean;
  loading?: "lazy" | "eager";
  children?: ReactNode;
};

/** Foto a sangre (sin margen), object-cover como al inicio. */
export function ProductMedia({
  src,
  alt,
  tone = "card",
  className,
  imgClassName,
  muted = false,
  loading = "lazy",
  children,
}: ProductMediaProps) {
  return (
    <div
      className={cn(
        "product-photo-frame relative overflow-hidden bg-smoke",
        tone === "card" && "aspect-[4/3]",
        tone === "detail" && "aspect-[4/3] rounded-[10px]",
        tone === "thumb" && "rounded-[10px]",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn(
          "product-photo h-full w-full object-cover object-center",
          tone === "thumb" && "aspect-square",
          muted && "product-photo--muted",
          imgClassName,
        )}
      />
      {children}
    </div>
  );
}
