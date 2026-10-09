export type ProductKind = "taco" | "drink";

export type Product = {
  id: string;
  kind: ProductKind;
  name: string;
  description: string;
  longDescription: string;
  ingredients: string[];
  weightGrams: number;
  serving: string;
  allergens: string[];
  priceCents: number;
  imageUrl: string;
  stock: number;
  soldOut: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

const tacoBase = {
  kind: "taco" as const,
  serving: "1 taco",
  allergens: ["Maíz", "Puede contener rastros de soya"],
};

export const seedProducts: Product[] = [
  {
    id: "a1a1a1a1-0001-4000-8000-000000000001",
    ...tacoBase,
    name: "Camarón capeado",
    description: "Especialidad de la casa. Camarón capeado crujiente, salsa y limón.",
    longDescription:
      "El taco de la casa: camarón fresco capeado hasta quedar crocante, sobre tortilla de maíz caliente. Se sirve con salsa y limón. Pídelo de mañana, cuando la plancha está a tope.",
    ingredients: ["Tortilla de maíz", "Camarón", "Harina para capear", "Aceite", "Salsa de la casa", "Limón", "Cilantro"],
    weightGrams: 110,
    priceCents: 2600,
    imageUrl: "/products/camaron_capeado.webp",
    stock: 50,
    soldOut: false,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000002",
    ...tacoBase,
    name: "Pescado empanizado",
    description: "Filete empanizado, crujiente por fuera, con salsa y limón.",
    longDescription:
      "Filete empanizado al momento, crujiente por fuera y suave por dentro. Va en tortilla de maíz con salsa y un toque de limón. Buen compañero de un agua fresca.",
    ingredients: ["Tortilla de maíz", "Filete de pescado", "Empanizado", "Aceite", "Salsa", "Limón"],
    weightGrams: 115,
    allergens: ["Pescado", "Gluten (empanizado)", "Maíz"],
    priceCents: 2600,
    imageUrl: "/products/pescado_empanizado.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 2,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000003",
    ...tacoBase,
    name: "Bistec de arrachera",
    description: "Arrachera a la plancha, jugosa, con cilantro y cebolla.",
    longDescription:
      "Arrachera a la plancha, cortada para taco, con su jugo. Cilantro y cebolla al gusto. Es el taco de carne que se pide cuando hay hambre de verdad.",
    ingredients: ["Tortilla de maíz", "Arrachera", "Cilantro", "Cebolla", "Salsa", "Limón"],
    weightGrams: 120,
    priceCents: 2600,
    imageUrl: "/products/arrachera.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 3,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000004",
    ...tacoBase,
    name: "Adobada de cerdo",
    description: "Cerdo adobado, marinada roja y el picor que pide un agua fresca.",
    longDescription:
      "Cerdo en adobo rojo, marinada con chile y especias, a la plancha. El picor pide agua de jamaica o limón. Un clásico de mostrador.",
    ingredients: ["Tortilla de maíz", "Cerdo", "Adobo de chiles", "Especias", "Salsa"],
    weightGrams: 105,
    priceCents: 2200,
    imageUrl: "/products/adobada.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 4,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000005",
    ...tacoBase,
    name: "Barbacoa",
    description: "Barbacoa suave, para desayunar con salsa y un limón aplastado.",
    longDescription:
      "Barbacoa suave, de esas que se deshacen. Desayuno de lunes a sábado: salsa, cilantro y limón. Ideal con un café o un agua chica.",
    ingredients: ["Tortilla de maíz", "Barbacoa de res", "Cilantro", "Cebolla", "Salsa", "Limón"],
    weightGrams: 108,
    priceCents: 2200,
    imageUrl: "/products/barbacoa.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 5,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000006",
    ...tacoBase,
    name: "Chicharrón prensado",
    description: "Chicharrón prensado, de los que se piden sin pensarlo dos veces.",
    longDescription:
      "Chicharrón prensado, con su grasa y su textura. Va en tortilla caliente. Si te gusta intenso, pide salsa roja.",
    ingredients: ["Tortilla de maíz", "Chicharrón prensado", "Salsa", "Cilantro"],
    weightGrams: 100,
    priceCents: 2200,
    imageUrl: "/products/chicharron_prensado.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 6,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000007",
    ...tacoBase,
    name: "Carnitas de puerco",
    description: "Carnitas doradas, con su grasa justa y salsa verde o roja.",
    longDescription:
      "Carnitas doradas, suaves por dentro. Un taco de confianza para la hora de la comida. Salsa verde o roja, como guste.",
    ingredients: ["Tortilla de maíz", "Carnitas de puerco", "Salsa", "Cilantro", "Cebolla"],
    weightGrams: 112,
    priceCents: 2200,
    imageUrl: "/products/carne_de_cerdo.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 7,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000008",
    ...tacoBase,
    name: "Huevo a la mexicana",
    description: "Huevo con jitomate, cebolla y chile. El taco de mañana por excelencia.",
    longDescription:
      "Huevo revuelto a la mexicana: jitomate, cebolla y chile. El taco con el que se abre el día en Vargas. Pide dos si vienes con hambre.",
    ingredients: ["Tortilla de maíz", "Huevo", "Jitomate", "Cebolla", "Chile", "Salsa"],
    weightGrams: 95,
    allergens: ["Huevo", "Maíz"],
    priceCents: 2200,
    imageUrl: "/products/huevos_mexicana.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 8,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000010",
    kind: "drink",
    name: "Agua fresca chica",
    description: "Jamaica, limón o piña. Escribe el sabor en las notas del pedido.",
    longDescription:
      "Agua fresca del día en tamaño chico: jamaica, limón o piña. Indica el sabor en las notas del pedido o por WhatsApp. Se sirve fría.",
    ingredients: ["Agua", "Fruta o flor del día (jamaica, limón o piña)", "Azúcar"],
    weightGrams: 350,
    serving: "Vaso chico ~350 ml",
    allergens: ["Puede contener azúcar"],
    priceCents: 2200,
    imageUrl: "/products/agua-chica.jpg",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 10,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000011",
    kind: "drink",
    name: "Agua fresca grande",
    description: "La misma jarra de jamaica, limón o piña, en tamaño grande.",
    longDescription:
      "La misma agua fresca, en grande. Para acompañar varios tacos o para el calor. Elige jamaica, limón o piña en las notas.",
    ingredients: ["Agua", "Fruta o flor del día (jamaica, limón o piña)", "Azúcar"],
    weightGrams: 600,
    serving: "Vaso grande ~600 ml",
    allergens: ["Puede contener azúcar"],
    priceCents: 3800,
    imageUrl: "/products/agua-grande.jpg",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 11,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000012",
    kind: "drink",
    name: "Coca-Cola 500 ml",
    description: "Envase de vidrio. Helada, para cortar el picor.",
    longDescription:
      "Coca-Cola en envase de vidrio de 500 ml. Helada. El clásico para cortar el picor de la adobada o el camarón.",
    ingredients: ["Refresco de cola"],
    weightGrams: 500,
    serving: "Botella de vidrio 500 ml",
    allergens: [],
    priceCents: 2700,
    imageUrl: "/products/coca-500.jpg",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 12,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000013",
    kind: "drink",
    name: "Coca-Cola 600 ml",
    description: "Envase desechable de 600 ml.",
    longDescription:
      "Coca-Cola en envase desechable de 600 ml. Para llevar o para la mesa. Mismo sabor, un poco más de vaso.",
    ingredients: ["Refresco de cola"],
    weightGrams: 600,
    serving: "Botella 600 ml",
    allergens: [],
    priceCents: 3300,
    imageUrl: "/products/coca-600.jpg",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 13,
  },
];

export function productPath(id: string) {
  return `/producto/${id}`;
}

export function relatedProducts(product: Product, catalog: Product[], limit = 4) {
  return catalog
    .filter((item) => item.id !== product.id && item.kind === product.kind)
    .slice(0, limit);
}

export function companionProducts(product: Product, catalog: Product[], limit = 4) {
  const want: ProductKind = product.kind === "taco" ? "drink" : "taco";
  return catalog
    .filter((item) => item.kind === want)
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder)
    .slice(0, limit);
}

export function fallbackDetails(product: Pick<Product, "description" | "name" | "kind">): Pick<
  Product,
  "longDescription" | "ingredients" | "weightGrams" | "serving" | "allergens"
> {
  return {
    longDescription: product.description,
    ingredients: product.kind === "taco" ? ["Tortilla de maíz", "Guiso del día", "Salsa"] : ["Bebida"],
    weightGrams: product.kind === "taco" ? 100 : 400,
    serving: product.kind === "taco" ? "1 taco" : "1 porción",
    allergens: [],
  };
}
