import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Replace, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

type MediaUploadProps = {
  value?: string | null;
  onChange: (file: File) => void | Promise<void>;
  onClear?: () => void;
  label?: string;
  hint?: string;
  aspect?: "square" | "wide" | "video";
  className?: string;
  busy?: boolean;
};

export function MediaUpload({
  value,
  onChange,
  onClear,
  label = "Imagen",
  hint = "JPG o PNG · se muestra en el sitio",
  aspect = "square",
  className,
  busy = false,
}: MediaUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const loading = busy || localBusy;

  const aspectClass =
    aspect === "wide" ? "aspect-[16/9]" : aspect === "video" ? "aspect-[4/3]" : "aspect-square";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLocalBusy(true);
    try {
      await onChange(file);
    } finally {
      setLocalBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-[10px] border border-dashed border-ink/20 bg-paper",
          aspectClass,
        )}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center gap-2 px-4 text-center text-clay">
            <ImagePlus size={28} aria-hidden />
            <p className="text-xs">{label}</p>
          </div>
        )}
        {loading ? (
          <div className="absolute inset-0 grid place-items-center bg-ink/35 text-white">
            <Loader2 size={24} className="animate-spin" aria-hidden />
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary inline-flex h-11 flex-1 items-center justify-center gap-2 px-3 text-sm"
        >
          {value ? <Replace size={16} aria-hidden /> : <ImagePlus size={16} aria-hidden />}
          {value ? "Cambiar imagen" : "Subir imagen"}
        </button>
        {value && onClear ? (
          <button
            type="button"
            disabled={loading}
            onClick={onClear}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-terracotta/35 px-3 text-sm font-medium text-terracotta"
            aria-label="Quitar imagen"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-clay">{hint}</p> : null}
    </div>
  );
}
