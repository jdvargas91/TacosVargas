export const kitchenCrew = {
  headline: "Manos en la plancha",
  lede: "Tres personas en cocina y servicio. El mismo vapor de las 7:30 y el taco que sale todavía caliente.",
  people: [
    {
      name: "Marisol Cuevas",
      role: "Elaboradora de Guisos",
      station: "Guisos de la casa: huevo a la mexicana, chicharrón y lo que salga del día en olla.",
      image: "/team/elaboradora_mariscos.png",
      imageAlt: "Estación de guisos",
    },
    {
      name: "Itzel Navarro",
      role: "Elaboradora de Carnes",
      station: "Arrachera, barbacoa, adobada y carnitas. El taco que se pide con hambre de verdad.",
      image: "/team/elaboradora_carnes.png",
      imageAlt: "Plancha con tacos de carne",
    },
    {
      name: "Paola Mendoza",
      role: "Personal de servicio",
      station: "Atiende el mostrador, toma pedidos y entrega el taco todavía caliente.",
      image: "/team/servicio.png",
      imageAlt: "Personal de servicio en el local",
    },
  ],
} as const;
