export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/logo-vargas.png"
      alt="Vargas Tacos"
      className={`h-10 w-auto object-contain drop-shadow-[0_6px_14px_rgb(0_0_0_/_0.35)] md:h-11 ${className}`}
    />
  );
}
