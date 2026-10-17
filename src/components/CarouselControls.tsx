import { ChevronLeft, ChevronRight } from "lucide-react";

export function CarouselControls({
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="ml-auto flex shrink-0 gap-2">
      <button
        type="button"
        aria-label={prevLabel}
        onClick={onPrev}
        className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={onNext}
        className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:bg-terracotta"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
