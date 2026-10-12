import { useEffect, useState, type KeyboardEvent } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MediaUpload } from "@/components/ui/MediaUpload";
import {
  useSiteContent,
  type AboutContent,
  type BusinessContent,
  type GalleryContent,
  type HeroContent,
  type KitchenContent,
} from "@/context/SiteContentContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/cn";

const GALLERY_LIMIT = 6;

const siteTabs = [
  { id: "negocio", label: "Negocio" },
  { id: "hero", label: "Hero" },
  { id: "about", label: "Quiénes somos" },
  { id: "cocina", label: "Cocina" },
  { id: "galeria", label: "Galería" },
] as const;

type SiteTab = (typeof siteTabs)[number]["id"];

export function SitioPanel() {
  const { business, hero, about, kitchen, gallery, saveBusiness, saveSection, uploadSiteMedia } = useSiteContent();
  const toast = useToast();
  const [biz, setBiz] = useState<BusinessContent>(business);
  const [heroDraft, setHeroDraft] = useState<HeroContent>(hero);
  const [aboutDraft, setAboutDraft] = useState<AboutContent>(about);
  const [kitchenDraft, setKitchenDraft] = useState<KitchenContent>(kitchen);
  const [galleryDraft, setGalleryDraft] = useState<GalleryContent>(gallery);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<SiteTab>("negocio");

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
      const heroToSave = {
        ...heroDraft,
        imageAlt: heroDraft.imageAlt?.trim() || `${biz.name} · platillo del día`,
      };
      const galleryToSave = {
        ...galleryDraft,
        shots: galleryDraft.shots.slice(0, GALLERY_LIMIT).map((shot, index) => ({
          ...shot,
          alt: shot.alt?.trim() || `Foto ${index + 1} · ${biz.name}`,
        })),
      };
      await saveBusiness(biz);
      await saveSection("hero", heroToSave);
      await saveSection("about", { ...aboutDraft, values: [] });
      await saveSection("kitchen", kitchenDraft);
      await saveSection("gallery", galleryToSave);
      setMessage("Contenido del sitio guardado.");
      toast.success("Sitio actualizado", "Los cambios ya se publicaron en la página.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      setError(msg);
      toast.error("Sitio no actualizado", msg);
    } finally {
      setSaving(false);
    }
  }

  function cancelAll() {
    setBiz(business);
    setHeroDraft(hero);
    setAboutDraft(about);
    setKitchenDraft(kitchen);
    setGalleryDraft(gallery);
    setError(null);
    setMessage(null);
  }

  async function upload(file: File, onUrl: (url: string) => void) {
    try {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const url = await uploadSiteMedia(file, path);
      onUrl(url);
      setMessage("Imagen subida. Guarda para publicar.");
      setError(null);
      toast.info("Imagen lista", "Guarda el sitio para publicarla.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al subir imagen";
      setError(msg);
      toast.error("Imagen no subida", msg);
    }
  }

  function updateShot(index: number, patch: Partial<GalleryContent["shots"][number]>) {
    const shots = galleryDraft.shots.map((shot, i) => (i === index ? { ...shot, ...patch } : shot));
    setGalleryDraft({ ...galleryDraft, shots });
  }

  function addShot() {
    if (galleryDraft.shots.length >= GALLERY_LIMIT) return;
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

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = siteTabs.findIndex((item) => item.id === tab);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? siteTabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + siteTabs.length) % siteTabs.length;
    setTab(siteTabs[next].id);
    document.getElementById(`sitio-tab-${siteTabs[next].id}`)?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div
        role="tablist"
        aria-label="Secciones del sitio"
        className="flex shrink-0 gap-1 overflow-x-auto rounded-[10px] border border-ink/10 bg-paper/80 p-1"
        onKeyDown={onTabKey}
      >
        {siteTabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              id={`sitio-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`sitio-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[9px] px-3 text-sm font-semibold transition sm:min-w-0 sm:flex-1",
                selected ? "bg-terracotta text-white shadow-sm" : "text-clay hover:bg-ink/5 hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? <p className="shrink-0 rounded-[10px] border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{error}</p> : null}
      {message ? <p className="shrink-0 rounded-[10px] border border-ink/10 bg-paper px-4 py-3 text-sm text-clay">{message}</p> : null}

      <div className="card-shadow flex min-h-0 flex-1 flex-col rounded-[10px] border border-ink/8 bg-smoke">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
      {tab === "negocio" ? (
      <section id="sitio-panel-negocio" role="tabpanel" aria-labelledby="sitio-tab-negocio" className="space-y-4">
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
          <Field label="Ubicación" value={biz.location.label} onChange={(v) => setBiz({ ...biz, location: { ...biz.location, label: v } })} />
          <Field
            label="Referencia / punto cercano"
            value={biz.location.landmark}
            onChange={(v) => setBiz({ ...biz, location: { ...biz.location, landmark: v } })}
          />
          <Field label="Ciudad" value={biz.location.city} onChange={(v) => setBiz({ ...biz, location: { ...biz.location, city: v } })} />
          <Field
            label="Enlace de Google Maps"
            value={biz.location.mapsUrl}
            onChange={(v) => setBiz({ ...biz, location: { ...biz.location, mapsUrl: v } })}
          />
          <Field
            label="Latitud"
            value={String(biz.location.lat)}
            onChange={(v) => setBiz({ ...biz, location: { ...biz.location, lat: Number(v) || biz.location.lat } })}
          />
          <Field
            label="Longitud"
            value={String(biz.location.lng)}
            onChange={(v) => setBiz({ ...biz, location: { ...biz.location, lng: Number(v) || biz.location.lng } })}
          />
          <Field label="Facebook" value={biz.socials.facebook} onChange={(v) => setBiz({ ...biz, socials: { ...biz.socials, facebook: v } })} />
          <Field label="Instagram" value={biz.socials.instagram} onChange={(v) => setBiz({ ...biz, socials: { ...biz.socials, instagram: v } })} />
          <label className="text-sm text-clay md:col-span-2">
            <span className="font-medium text-ink/80">Texto de pago</span>
            <textarea
              value={biz.payment}
              onChange={(e) => setBiz({ ...biz, payment: e.target.value })}
              className="mt-2 min-h-16 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
          <Field
            label="Banco (transferencia)"
            value={biz.cardPayment.bank}
            onChange={(v) => setBiz({ ...biz, cardPayment: { ...biz.cardPayment, bank: v } })}
          />
          <Field
            label="Titular de la cuenta"
            value={biz.cardPayment.accountName}
            onChange={(v) => setBiz({ ...biz, cardPayment: { ...biz.cardPayment, accountName: v } })}
          />
          <Field
            label="CLABE"
            value={biz.cardPayment.clabe}
            onChange={(v) => setBiz({ ...biz, cardPayment: { ...biz.cardPayment, clabe: v } })}
          />
          <Field
            label="Número de tarjeta"
            value={biz.cardPayment.cardNumber}
            onChange={(v) => setBiz({ ...biz, cardPayment: { ...biz.cardPayment, cardNumber: v } })}
          />
          <label className="text-sm text-clay md:col-span-2">
            <span className="font-medium text-ink/80">Instrucción de transferencia</span>
            <textarea
              value={biz.cardPayment.hint}
              onChange={(e) => setBiz({ ...biz, cardPayment: { ...biz.cardPayment, hint: e.target.value } })}
              className="mt-2 min-h-16 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
        </div>
      </section>

      ) : null}

      {tab === "hero" ? (
      <section id="sitio-panel-hero" role="tabpanel" aria-labelledby="sitio-tab-hero" className="space-y-4">
        <h2 className="font-display text-2xl text-ink">Hero</h2>
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

      ) : null}

      {tab === "about" ? (
      <section id="sitio-panel-about" role="tabpanel" aria-labelledby="sitio-tab-about" className="space-y-4">
        <h2 className="font-display text-2xl text-ink">Quiénes somos</h2>
        <Field label="Titular" value={aboutDraft.headline} onChange={(v) => setAboutDraft({ ...aboutDraft, headline: v })} />
        <label className="text-sm text-clay">
          <span className="font-medium text-ink/80">Historia (párrafos separados por línea en blanco)</span>
          <textarea
            value={aboutDraft.paragraphs.join("\n\n")}
            onChange={(e) =>
              setAboutDraft({
                ...aboutDraft,
                paragraphs: e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
              })
            }
            className="mt-2 min-h-28 w-full rounded-[10px] border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>
        <MediaUpload
          className="max-w-xs"
          label="Foto Quiénes somos"
          value={aboutDraft.image}
          onChange={(file) => upload(file, (url) => setAboutDraft({ ...aboutDraft, image: url }))}
        />
      </section>

      ) : null}

      {tab === "cocina" ? (
      <section id="sitio-panel-cocina" role="tabpanel" aria-labelledby="sitio-tab-cocina" className="space-y-4">
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
          <div key={index} className="grid gap-4 rounded-[10px] border border-ink/10 bg-paper/50 p-4 md:grid-cols-[140px_1fr]">
            <MediaUpload
              label="Foto de perfil"
              hint="JPG o PNG · se muestra en Cocina"
              value={person.image}
              onChange={(file) =>
                upload(file, (url) => {
                  const people = [...kitchenDraft.people];
                  people[index] = {
                    ...people[index],
                    image: url,
                    imageAlt: people[index].imageAlt || `Foto de ${people[index].name}`,
                  };
                  setKitchenDraft({ ...kitchenDraft, people });
                })
              }
            />
            <div className="grid gap-2">
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
          </div>
        ))}
      </section>

      ) : null}

      {tab === "galeria" ? (
      <section id="sitio-panel-galeria" role="tabpanel" aria-labelledby="sitio-tab-galeria" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink">Galería</h2>
            <p className="mt-1 text-sm text-clay">
              Hasta {GALLERY_LIMIT} fotos. El orden de la lista es el orden de las tarjetas.
              {galleryDraft.shots.length > GALLERY_LIMIT
                ? " Hay fotos de más: al guardar se conservan solo las primeras 6."
                : ""}
            </p>
          </div>
          {galleryDraft.shots.length < GALLERY_LIMIT ? (
            <button type="button" onClick={addShot} className="btn-secondary h-11 w-full px-4 text-sm sm:w-auto">
              <Plus size={16} aria-hidden />
              Agregar foto
            </button>
          ) : (
            <p className="text-sm font-medium text-clay">Máximo {GALLERY_LIMIT} fotos</p>
          )}
        </div>

        <Field label="Titular" value={galleryDraft.headline} onChange={(v) => setGalleryDraft({ ...galleryDraft, headline: v })} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {galleryDraft.shots.slice(0, GALLERY_LIMIT).map((shot, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-[10px] border border-ink/10 bg-paper/40 p-3">
              <MediaUpload
                label={`Foto ${index + 1}`}
                value={shot.src || null}
                hint="Sube la foto de la tarjeta"
                onChange={(file) => upload(file, (url) => updateShot(index, { src: url }))}
              />
              <button
                type="button"
                onClick={() => removeShot(index)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-terracotta/35 px-4 text-sm font-medium text-terracotta"
              >
                <Trash2 size={16} aria-hidden />
                Quitar foto
              </button>
            </div>
          ))}
        </div>
        {galleryDraft.shots.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-clay">
            No hay fotos. Agrega al menos una para el tendedero.
          </p>
        ) : null}
      </section>
      ) : null}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-ink/10 px-4 py-4 sm:justify-end sm:px-5 md:px-6">
          <button type="button" disabled={saving} onClick={cancelAll} className="btn-secondary h-12 min-w-0 flex-1 px-6 sm:flex-none">
            Cancelar
          </button>
          <button type="button" disabled={saving} onClick={() => void saveAll()} className="btn-accent h-12 min-w-0 flex-1 px-6 sm:flex-none">
            <Save size={16} aria-hidden />
            {saving ? "Guardando…" : "Guardar sitio"}
          </button>
        </div>
      </div>
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
