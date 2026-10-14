export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/logo-vargas.webp"
      alt="Vargas Tacos"
      className={`h-10 w-auto object-contain md:h-11 ${className}`}
    />
  );
}
