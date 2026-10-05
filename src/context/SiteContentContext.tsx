import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { business as fallbackBusiness } from "@/data/business";
import { about as fallbackAbout } from "@/data/about";
import { kitchenCrew as fallbackKitchen } from "@/data/kitchen";
import { supabase } from "@/lib/supabase";
import { repairDeep } from "@/lib/text";

export type BusinessContent = {
  name: string;
  legalName: string;
  slogan: string;
  phone: string;
  whatsapp: string;
  hours: {
    label: string;
    days: string;
    opens: string;
    closes: string;
    weekdays: number[];
  };
  location: {
    city: string;
    region: string;
    country: string;
    addressConfirmed: boolean;
    street: string;
    label: string;
    lat: number;
    lng: number;
  };
  payment: string;
  cardPayment: {
    bank: string;
    accountName: string;
    clabe: string;
    cardNumber: string;
    hint: string;
  };
  socials: {
    facebook: string;
    instagram: string;
    tiktok: string;
  };
};

export type AboutContent = {
  headline: string;
  paragraphs: string[];
  values: { title: string; body: string }[];
  image: string;
};

export type KitchenContent = {
  headline: string;
  lede: string;
  people: {
    name: string;
    role: string;
    station: string;
    image: string;
    imageAlt: string;
  }[];
};

export type GalleryContent = {
  headline: string;
  bandImage: string;
  shots: { src: string; alt: string; className: string }[];
};

export type HeroContent = {
  headline: string;
  imageDesktop: string;
  imageMobile: string;
  imageAlt: string;
};

type SiteContentValue = {
  loading: boolean;
  business: BusinessContent;
  hero: HeroContent;
  about: AboutContent;
  kitchen: KitchenContent;
  gallery: GalleryContent;
  refresh: () => Promise<void>;
  saveBusiness: (next: BusinessContent) => Promise<void>;
  saveSection: (id: string, content: unknown) => Promise<void>;
  uploadSiteMedia: (file: File, path: string) => Promise<string>;
};

const defaultHero: HeroContent = {
  headline: fallbackBusiness.name,
  imageDesktop: "/hero.webp",
  imageMobile: "/hero_cel.webp",
  imageAlt: "Tacos recién hechos sobre plancha, vapor y limón",
};

const defaultAbout: AboutContent = {
  headline: fallbackAbout.headline,
  paragraphs: [...fallbackAbout.paragraphs],
  values: fallbackAbout.values.map((v) => ({ ...v })),
  image: "/about.jpg",
};

const defaultKitchen: KitchenContent = {
  headline: fallbackKitchen.headline,
  lede: fallbackKitchen.lede,
  people: fallbackKitchen.people.map((p) => ({ ...p })),
};

const defaultGallery: GalleryContent = {
  headline: "El primer bocado",
  bandImage: "/about.jpg",
  shots: [
    {
      src: "/gallery/plancha.jpg",
      alt: "Tacos en la plancha",
      className: "md:col-start-1 md:row-start-1 md:row-span-2",
    },
    {
      src: "/products/camaron.jpg",
      alt: "Taco de camarón capeado",
      className: "md:col-start-2 md:col-span-2 md:row-start-1",
    },
    {
      src: "/products/barbacoa.jpg",
      alt: "Taco de barbacoa",
      className: "md:col-start-2 md:row-start-2",
    },
    {
      src: "/products/bistec.jpg",
      alt: "Taco de bistec de arrachera",
      className: "md:col-start-3 md:row-start-2",
    },
    {
      src: "/products/adobada.jpg",
      alt: "Taco de adobada de cerdo",
      className: "md:col-start-1 md:row-start-3",
    },
    {
      src: "/about.jpg",
      alt: "Tacos al vapor",
      className: "md:col-start-2 md:col-span-2 md:row-start-3",
    },
  ],
};

const SiteContentContext = createContext<SiteContentValue | null>(null);

function asBusiness(value: unknown): BusinessContent {
  const v = repairDeep(value) as Partial<BusinessContent> | null;
  if (!v || typeof v !== "object") {
    return {
      ...fallbackBusiness,
      hours: { ...fallbackBusiness.hours, weekdays: [...fallbackBusiness.hours.weekdays] },
      location: { ...fallbackBusiness.location },
      cardPayment: { ...fallbackBusiness.cardPayment },
      socials: { ...fallbackBusiness.socials },
    };
  }
  return {
    name: v.name ?? fallbackBusiness.name,
    legalName: v.legalName ?? fallbackBusiness.legalName,
    slogan: v.slogan ?? fallbackBusiness.slogan,
    phone: v.phone ?? fallbackBusiness.phone,
    whatsapp: v.whatsapp ?? fallbackBusiness.whatsapp,
    hours: {
      label: v.hours?.label ?? fallbackBusiness.hours.label,
      days: v.hours?.days ?? fallbackBusiness.hours.days,
      opens: v.hours?.opens ?? fallbackBusiness.hours.opens,
      closes: v.hours?.closes ?? fallbackBusiness.hours.closes,
      weekdays: v.hours?.weekdays ?? [...fallbackBusiness.hours.weekdays],
    },
    location: {
      city: v.location?.city ?? fallbackBusiness.location.city,
      region: v.location?.region ?? fallbackBusiness.location.region,
      country: v.location?.country ?? fallbackBusiness.location.country,
      addressConfirmed: v.location?.addressConfirmed ?? fallbackBusiness.location.addressConfirmed,
      street: v.location?.street ?? fallbackBusiness.location.street,
      label: v.location?.label ?? fallbackBusiness.location.label,
      lat: v.location?.lat ?? fallbackBusiness.location.lat,
      lng: v.location?.lng ?? fallbackBusiness.location.lng,
    },
    payment: v.payment ?? fallbackBusiness.payment,
    cardPayment: {
      bank: v.cardPayment?.bank ?? fallbackBusiness.cardPayment.bank,
      accountName: v.cardPayment?.accountName ?? fallbackBusiness.cardPayment.accountName,
      clabe: v.cardPayment?.clabe ?? fallbackBusiness.cardPayment.clabe,
      cardNumber: v.cardPayment?.cardNumber ?? fallbackBusiness.cardPayment.cardNumber,
      hint: v.cardPayment?.hint ?? fallbackBusiness.cardPayment.hint,
    },
    socials: {
      facebook: v.socials?.facebook ?? fallbackBusiness.socials.facebook,
      instagram: v.socials?.instagram ?? fallbackBusiness.socials.instagram,
      tiktok: v.socials?.tiktok ?? fallbackBusiness.socials.tiktok,
    },
  };
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(Boolean(supabase));
  const [business, setBusiness] = useState<BusinessContent>(asBusiness(fallbackBusiness));
  const [hero, setHero] = useState<HeroContent>(defaultHero);
  const [about, setAbout] = useState<AboutContent>(defaultAbout);
  const [kitchen, setKitchen] = useState<KitchenContent>(defaultKitchen);
  const [gallery, setGallery] = useState<GalleryContent>(defaultGallery);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const [settingsRes, sectionsRes] = await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("site_sections").select("id, kind, content").eq("is_published", true),
    ]);

    if (settingsRes.data) {
      const businessRow = settingsRes.data.find((row) => row.key === "business");
      if (businessRow) setBusiness(asBusiness(businessRow.value));
    }

    if (sectionsRes.data) {
      for (const section of sectionsRes.data) {
        const content = repairDeep(section.content) as object;
        if (section.id === "hero") setHero({ ...defaultHero, ...content });
        if (section.id === "about") setAbout({ ...defaultAbout, ...content });
        if (section.id === "kitchen") setKitchen({ ...defaultKitchen, ...content });
        if (section.id === "gallery") setGallery({ ...defaultGallery, ...content });
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveBusiness = useCallback(
    async (next: BusinessContent) => {
      if (!supabase) throw new Error("Supabase no configurado");
      const { error } = await supabase.from("site_settings").upsert({
        key: "business",
        value: next,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setBusiness(next);
    },
    [],
  );

  const saveSection = useCallback(async (id: string, content: unknown) => {
    if (!supabase) throw new Error("Supabase no configurado");
    const { error } = await supabase.from("site_sections").upsert({
      id,
      kind: id === "footer_note" ? "footer_note" : id,
      content,
      is_published: true,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    if (id === "hero") setHero({ ...defaultHero, ...(content as object) });
    if (id === "about") setAbout({ ...defaultAbout, ...(content as object) });
    if (id === "kitchen") setKitchen({ ...defaultKitchen, ...(content as object) });
    if (id === "gallery") setGallery({ ...defaultGallery, ...(content as object) });
  }, []);

  const uploadSiteMedia = useCallback(async (file: File, path: string) => {
    if (!supabase) throw new Error("Supabase no configurado");
    const { error } = await supabase.storage.from("site-media").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("site-media").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const value = useMemo(
    () => ({
      loading,
      business,
      hero,
      about,
      kitchen,
      gallery,
      refresh,
      saveBusiness,
      saveSection,
      uploadSiteMedia,
    }),
    [about, business, gallery, hero, kitchen, loading, refresh, saveBusiness, saveSection, uploadSiteMedia],
  );

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSiteContent debe usarse dentro de SiteContentProvider");
  return ctx;
}
