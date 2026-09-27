import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { Select } from "@/components/ui/Select";
import {
  useSiteContent,
  type AboutContent,
  type BusinessContent,
  type GalleryContent,
  type HeroContent,
  type KitchenContent,
} from "@/context/SiteContentContext";

const shotLayouts = [
  { value: "md:col-start-1 md:row-start-1 md:row-span-2", label: "Alta · columna 1" },
  { value: "md:col-start-2 md:col-span-2 md:row-start-1", label: "Ancha · fila superior" },
  { value: "md:col-start-2 md:row-start-2", label: "Cuadrada · centro" },
  { value: "md:col-start-3 md:row-start-2", label: "Cuadrada · derecha" },
  { value: "md:col-start-1 md:row-start-3", label: "Cuadrada · abajo izq." },
  { value: "md:col-start-2 md:col-span-2 md:row-start-3", label: "Ancha · fila inferior" },
  { value: "auto", label: "Automática (flujo)" },
];

function layoutValue(className: string) {
  return className || "auto";
}

function layoutClass(value: string) {
  return value === "auto" ? "" : value;
}

export function SitioPanel() {
  const { business, hero, about, kitchen, gallery, saveBusiness, saveSection, uploadSiteMedia } = useSiteContent();
  const [biz, setBiz] = useState<BusinessContent>(business);
  const [heroDraft, setHeroDraft] = useState<HeroContent>(hero);
  const [aboutDraft, setAboutDraft] = useState<AboutContent>(about);
  const [kitchenDraft, setKitchenDraft] = useState<KitchenContent>(kitchen);
  const [galleryDraft, setGalleryDraft] = useState<GalleryContent>(gallery);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBiz(business);
    setHeroDraft(hero);
    setAboutDraft(about);
    setKitchenDraft(kitchen);
    setGalleryDraft(gallery);
  }, [about, business, gallery, hero, kitchen]);

  async function saveAll() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveBusiness(biz);
      await saveSection("hero", heroDraft);
      await saveSection("about", aboutDraft);
      await saveSection("kitchen", kitchenDraft);
      await saveSection("gallery", galleryDraft);
      setMessage("Contenido del sitio guardado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File, onUrl: (url: string) => void) {
    try {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const url = await uploadSiteMedia(file, path);
      onUrl(url);
      setMessage("Imagen subida. Guarda para publicar.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir imagen");
    }
  }

  function updateShot(index: number, patch: Partial<GalleryContent["shots"][number]>) {
    const shots = galleryDraft.shots.map((shot, i) => (i === index ? { ...shot, ...patch } : shot));
    setGalleryDraft({ ...galleryDraft, shots });
  }

  function addShot() {
    setGalleryDraft({
      ...galleryDraft,
      shots: [
        ...galleryDraft.shots,
        { src: "", alt: "Nueva foto", className: "" },
      ],
    });
  }

  function removeShot(index: number) {
    setGalleryDraft({
      ...galleryDraft,
      shots: galleryDraft.shots.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="mt-2 space-y-8">
      {error ? <p className="rounded-[10px] border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{error}</p> : null}
      {message ? <p className="rounded-[10px] border border-ink/10 bg-paper px-4 py-3 text-sm text-clay">{message}</p> : null}

      <section className="card-shadow space-y-4 rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">Negocio y contacto</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre" value={biz.name} onChange={(v) => setBiz({ ...biz, name: v })} />
          <Field label="Slogan" value={biz.slogan} onChange={(v) => setBiz({ ...biz, slogan: v })} />
          <Field label="Teléfono" value={biz.phone} onChange={(v) => setBiz({ ...biz, phone: v })} />
          <Field label="WhatsApp (intl)" value={biz.whatsapp} onChange={(v) => setBiz({ ...biz, whatsapp: v })} />
          <Field label="Horario (texto)" value={biz.hours.label} onChange={(v) => setBiz({ ...biz, hours: { ...biz.hours, label: v } })} />
          <Field label="Días" value={biz.hours.days} onChange={(v) => setBiz({ ...biz, hours: { ...biz.hours, days: v } })} />
          <Field label="Abre (HH:MM)" value={biz.hours.opens} onChange={(v) => setBiz({ ...biz, hours: { ...biz.hours, opens: v } })} />
          <Field label="Cierra (HH:MM)" value={biz.hours.closes} onChange={(v) => setBiz({ ...biz, hours: { ...biz.hours, closes: v } })} />
          <Field label="Ubicación (label)" value={biz.location.label} onChange={(v) => setBiz({ ...biz, location: { ...biz.location, label: v } })} />
          <Field label="Ciudad" value={biz.location.city} onChange={(v) => setBiz({ ...biz, location: { ...biz.location, city: v } })} />
          <Field label="Facebook" value={biz.socials.facebook} onChange={(v) => setBiz({ ...biz, socials: { ...biz.socials, facebook: v } })} />
          <Field label="Instagram" value={biz.socials.instagram} onChange={(v) => setBiz({ ...biz, socials: { ...biz.socials, instagram: v } })} />
          <Field label="TikTok" value={biz.socials.tiktok} onChange={(v) => setBiz({ ...biz, socials: { ...biz.socials, tiktok: v } })} />
          <label className="text-sm text-clay md:col-span-2">
            <span className="font-medium text-ink/80">Texto de pago</span>
            <textarea
              value={biz.payment}
              onChange={(e) => setBiz({ ...biz, payment: e.target.value })}
              className="mt-2 min-h-16 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
        </div>
      </section>

      <section className="card-shadow space-y-4 rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">Hero</h2>
        <Field label="Alt de imagen" value={heroDraft.imageAlt} onChange={(v) => setHeroDraft({ ...heroDraft, imageAlt: v })} />
        <div className="grid gap-5 md:grid-cols-2">
          <MediaUpload
            label="Hero desktop"
            aspect="wide"
            value={heroDraft.imageDesktop}
            hint="Imagen ancha para pantallas grandes"
            onChange={(file) => upload(file, (url) => setHeroDraft({ ...heroDraft, imageDesktop: url }))}
          />
          <MediaUpload
            label="Hero móvil"
            aspect="video"
            value={heroDraft.imageMobile}
            hint="Imagen vertical / móvil"
            onChange={(file) => upload(file, (url) => setHeroDraft({ ...heroDraft, imageMobile: url }))}
          />
        </div>
      </section>

      <section className="card-shadow space-y-4 rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">Quiénes somos</h2>
        <Field label="Titular" value={aboutDraft.headline} onChange={(v) => setAboutDraft({ ...aboutDraft, headline: v })} />
        <label className="text-sm text-clay">
          <span className="font-medium text-ink/80">Párrafos (uno por línea)</span>
          <textarea
            value={aboutDraft.paragraphs.join("\n\n")}
            onChange={(e) =>
              setAboutDraft({
                ...aboutDraft,
                paragraphs: e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
              })
            }
            className="mt-2 min-h-40 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>
        <MediaUpload
          className="max-w-xs"
          label="Foto Quiénes somos"
          value={aboutDraft.image}
          onChange={(file) => upload(file, (url) => setAboutDraft({ ...aboutDraft, image: url }))}
        />
      </section>

      <section className="card-shadow space-y-4 rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">Cocina</h2>
        <Field label="Titular" value={kitchenDraft.headline} onChange={(v) => setKitchenDraft({ ...kitchenDraft, headline: v })} />
        <label className="text-sm text-clay">
          <span className="font-medium text-ink/80">Intro</span>
          <textarea
            value={kitchenDraft.lede}
            onChange={(e) => setKitchenDraft({ ...kitchenDraft, lede: e.target.value })}
            className="mt-2 min-h-20 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>
        {kitchenDraft.people.map((person, index) => (
          <div key={index} className="rounded-[10px] border border-ink/10 bg-paper/50 p-4">
            <Field
              label="Nombre"
              value={person.name}
              onChange={(v) => {
                const people = [...kitchenDraft.people];
                people[index] = { ...people[index], name: v };
                setKitchenDraft({ ...kitchenDraft, people });
              }}
            />
            <Field
              label="Rol"
              value={person.role}
              onChange={(v) => {
                const people = [...kitchenDraft.people];
                people[index] = { ...people[index], role: v };
                setKitchenDraft({ ...kitchenDraft, people });
              }}
            />
            <label className="mt-2 block text-sm text-clay">
              <span className="font-medium text-ink/80">Estación</span>
              <textarea
                value={person.station}
                onChange={(e) => {
                  const people = [...kitchenDraft.people];
                  people[index] = { ...people[index], station: e.target.value };
                  setKitchenDraft({ ...kitchenDraft, people });
                }}
                className="mt-2 min-h-16 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
              />
            </label>
          </div>
        ))}
      </section>

      <section className="card-shadow space-y-4 rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink">Galería</h2>
            <p className="mt-1 text-sm text-clay">Titular, banda y fotos del mosaico. Sube y ordena cada imagen.</p>
          </div>
          <button type="button" onClick={addShot} className="btn-secondary h-11 px-4 text-sm">
            <Plus size={16} aria-hidden />
            Agregar foto
          </button>
        </div>

        <Field label="Titular" value={galleryDraft.headline} onChange={(v) => setGalleryDraft({ ...galleryDraft, headline: v })} />

        <div>
          <p className="mb-2 text-sm font-medium text-ink/80">Imagen de banda (parallax)</p>
          <MediaUpload
            className="max-w-md"
            label="Banda de galería"
            aspect="wide"
            value={galleryDraft.bandImage}
            onChange={(file) => upload(file, (url) => setGalleryDraft({ ...galleryDraft, bandImage: url }))}
          />
        </div>

        <div className="space-y-4">
          {galleryDraft.shots.map((shot, index) => (
            <div key={index} className="grid gap-4 rounded-[10px] border border-ink/10 bg-paper/40 p-4 md:grid-cols-[140px_1fr]">
              <MediaUpload
                label={`Foto ${index + 1}`}
                value={shot.src || null}
                hint="Sube la imagen del mosaico"
                onChange={(file) =>
                  upload(file, (url) => updateShot(index, { src: url }))
                }
              />
              <div className="grid gap-3">
                <Field label="Texto alternativo" value={shot.alt} onChange={(v) => updateShot(index, { alt: v })} />
                <label className="text-sm text-clay">
                  <span className="font-medium text-ink/80">Posición en el mosaico</span>
                  <Select
                    className="mt-2"
                    value={layoutValue(shot.className)}
                    onValueChange={(v) => updateShot(index, { className: layoutClass(v) })}
                    options={
                      shotLayouts.some((opt) => opt.value === layoutValue(shot.className))
                        ? shotLayouts
                        : [...shotLayouts, { value: shot.className, label: "Personalizada" }]
                    }
                    aria-label={`Posición de foto ${index + 1}`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeShot(index)}
                  className="inline-flex h-11 w-fit items-center gap-2 rounded-[10px] border border-terracotta/35 px-4 text-sm font-medium text-terracotta"
                >
                  <Trash2 size={16} aria-hidden />
                  Quitar foto
                </button>
              </div>
            </div>
          ))}
          {galleryDraft.shots.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-clay">
              No hay fotos. Agrega al menos una para el mosaico.
            </p>
          ) : null}
        </div>
      </section>

      <button type="button" disabled={saving} onClick={() => void saveAll()} className="btn-accent h-12 px-6">
        <Save size={16} aria-hidden />
        {saving ? "Guardando…" : "Guardar sitio"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm text-clay">
      <span className="font-medium text-ink/80">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
      />
    </label>
  );
}
