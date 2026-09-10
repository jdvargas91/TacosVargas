export type Review = {
  id: string;
  author: string;
  rating: number;
  text: string;
  publishedAt: string;
  visible: boolean;
};

export const seedReviews: Review[] = [
  {
    id: "rev-1",
    author: "Mariana G.",
    rating: 5,
    text: "El camarón capeado se pide solo. Llegué a las 8 y todavía había cola, pero vale la espera.",
    publishedAt: "2026-08-12",
    visible: true,
  },
  {
    id: "rev-2",
    author: "Luis R.",
    rating: 5,
    text: "Barbacoa de desayuno y agua de jamaica. Horario de mañana, justo lo que buscaba.",
    publishedAt: "2026-07-28",
    visible: true,
  },
  {
    id: "rev-3",
    author: "Carla P.",
    rating: 4,
    text: "Buen bistec y el trato es de barrio. Falta que confirmen la dirección exacta en el mapa, pero el taco está.",
    publishedAt: "2026-06-03",
    visible: true,
  },
];
