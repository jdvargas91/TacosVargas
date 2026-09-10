export const kitchenCrew = {
  headline: "Manos en la plancha",
  lede: "Tres elaboradoras, tres estaciones. El mismo vapor de las 7:30 y el taco que sale todavía caliente.",
  people: [
    {
      name: "Marisol Cuevas",
      role: "Elaboradora de mariscos",
      station: "Camarón capeado y pescado empanizado. La especialidad de la casa sale de su estación.",
      image: "/products/camaron.jpg",
      imageAlt: "Taco de camarón capeado, estación de mariscos",
    },
    {
      name: "Itzel Navarro",
      role: "Elaboradora de carnes",
      station: "Arrachera, barbacoa, adobada y carnitas. El taco que se pide con hambre de verdad.",
      image: "/gallery/plancha.jpg",
      imageAlt: "Plancha con tacos de carne",
    },
    {
      name: "Paola Mendoza",
      role: "Elaboradora de la mañana",
      station: "Huevo a la mexicana y chicharrón prensado. El primer taco del día.",
      image: "/products/huevo.jpg",
      imageAlt: "Taco de huevo a la mexicana, estación de mañana",
    },
  ],
} as const;
