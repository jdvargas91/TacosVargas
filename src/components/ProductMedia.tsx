import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ProductMediaProps = {
  src: string;
  alt: string;
  /** "card" = menú; "detail" = ficha grande; "thumb" = miniatura. */
  tone?: "card" | "detail" | "thumb";
  className?: string;
  imgClassName?: string;
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
  loading = "lazy",
  children,
}: ProductMediaProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-smoke",
        tone === "card" && "aspect-[4/3] rounded-t-2xl",
        tone === "detail" && "aspect-[4/3] rounded-2xl",
        tone === "thumb" && "rounded-xl",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn(
          "h-full w-full object-cover object-center",
          tone === "thumb" && "aspect-square",
          imgClassName,
        )}
      />
      {children}
    </div>
  );
}
