import { useEffect, useState } from "react";
import {
  useSiteContent,
  type AboutContent,
  type BusinessContent,
  type GalleryContent,
  type HeroContent,
  type KitchenContent,
} from "@/context/SiteContentContext";

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
      const path = `${Date.now()}-${file.name}`;
      const url = await uploadSiteMedia(file, path);
      onUrl(url);
      setMessage("Imagen subida. Guarda para publicar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir imagen");
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {error ? <p className="text-terracotta">{error}</p> : null}
      {message ? <p className="text-clay">{message}</p> : null}

      <section className="card-shadow space-y-3 rounded-2xl bg-smoke p-5">
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
            Texto de pago
            <textarea
              value={biz.payment}
              onChange={(e) => setBiz({ ...biz, payment: e.target.value })}
              className="mt-2 min-h-16 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
        </div>
      </section>

      <section className="card-shadow space-y-3 rounded-2xl bg-smoke p-5">
        <h2 className="font-display text-2xl text-ink">Hero</h2>
        <Field label="Alt de imagen" value={heroDraft.imageAlt} onChange={(v) => setHeroDraft({ ...heroDraft, imageAlt: v })} />
        <p className="text-sm text-clay">Desktop: {heroDraft.imageDesktop}</p>
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, (url) => setHeroDraft({ ...heroDraft, imageDesktop: url })); }} />
        <p className="text-sm text-clay">Móvil: {heroDraft.imageMobile}</p>
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, (url) => setHeroDraft({ ...heroDraft, imageMobile: url })); }} />
      </section>

      <section className="card-shadow space-y-3 rounded-2xl bg-smoke p-5">
        <h2 className="font-display text-2xl text-ink">Quiénes somos</h2>
        <Field label="Titular" value={aboutDraft.headline} onChange={(v) => setAboutDraft({ ...aboutDraft, headline: v })} />
        <label className="text-sm text-clay">
          Párrafos (uno por línea)
          <textarea
            value={aboutDraft.paragraphs.join("\n\n")}
            onChange={(e) =>
              setAboutDraft({
                ...aboutDraft,
                paragraphs: e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
              })
            }
            className="mt-2 min-h-40 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>
        <p className="text-sm text-clay">Imagen: {aboutDraft.image}</p>
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, (url) => setAboutDraft({ ...aboutDraft, image: url })); }} />
      </section>

      <section className="card-shadow space-y-3 rounded-2xl bg-smoke p-5">
        <h2 className="font-display text-2xl text-ink">Cocina</h2>
        <Field label="Titular" value={kitchenDraft.headline} onChange={(v) => setKitchenDraft({ ...kitchenDraft, headline: v })} />
        <label className="text-sm text-clay">
          Intro
          <textarea
            value={kitchenDraft.lede}
            onChange={(e) => setKitchenDraft({ ...kitchenDraft, lede: e.target.value })}
            className="mt-2 min-h-20 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
          />
        </label>
        {kitchenDraft.people.map((person, index) => (
          <div key={index} className="rounded-xl border border-ink/10 p-3">
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
              Estación
              <textarea
                value={person.station}
                onChange={(e) => {
                  const people = [...kitchenDraft.people];
                  people[index] = { ...people[index], station: e.target.value };
                  setKitchenDraft({ ...kitchenDraft, people });
                }}
                className="mt-2 min-h-16 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
              />
            </label>
          </div>
        ))}
      </section>

      <section className="card-shadow space-y-3 rounded-2xl bg-smoke p-5">
        <h2 className="font-display text-2xl text-ink">Galería</h2>
        <Field label="Titular" value={galleryDraft.headline} onChange={(v) => setGalleryDraft({ ...galleryDraft, headline: v })} />
        <p className="text-sm text-clay">{galleryDraft.shots.length} fotos configuradas (rutas en content JSON).</p>
      </section>

      <button type="button" disabled={saving} onClick={() => void saveAll()} className="btn-accent h-12 px-6">
        {saving ? "Guardando…" : "Guardar sitio"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm text-clay">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-ink"
      />
    </label>
  );
}
