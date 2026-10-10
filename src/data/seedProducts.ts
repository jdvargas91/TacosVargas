export type ProductKind = "taco" | "drink";

export type DrinkSizeId = "chica" | "grande";

export type DrinkSize = {
  id: DrinkSizeId;
  label: string;
  priceCents: number;
};

/** Tamaños y precios fijos de las aguas frescas. */
export const AGUA_SIZES: DrinkSize[] = [
  { id: "chica", label: "Chica", priceCents: 2200 },
  { id: "grande", label: "Grande", priceCents: 3800 },
];

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
  /** Si existe, la bebida se pide eligiendo tamaño (chica/grande). */
  sizes?: DrinkSize[];
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
    name: "Jamaica",
    description: "Roja, ácida y bien fría. La que pide el taco de adobada.",
    longDescription:
      "Flor de jamaica macerada hasta quedar profunda y con ese ácido que limpia el paladar. Ideal entre tacos picantes o cuando el calor de Manzanillo ya aprieta. Elige vaso chico o grande.",
    ingredients: [],
    weightGrams: 0,
    serving: "Agua fresca",
    allergens: [],
    priceCents: 2200,
    imageUrl: "/products/jamaica.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 10,
    sizes: AGUA_SIZES,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000011",
    kind: "drink",
    name: "Piña",
    description: "Dulce tropical, jugosa, para acompañar camarón o pescado.",
    longDescription:
      "Piña madura licuada, con cuerpo y un dulzor natural que no se siente empalagoso. Combina de maravilla con los tacos capeados. Elige vaso chico o grande.",
    ingredients: [],
    weightGrams: 0,
    serving: "Agua fresca",
    allergens: [],
    priceCents: 2200,
    imageUrl: "/products/pina.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 11,
    sizes: AGUA_SIZES,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000014",
    kind: "drink",
    name: "Limón con chía",
    description: "Cítrica, ligera y con la semilla que refresca de verdad.",
    longDescription:
      "Limón recién exprimido con chía hidratada: ácida, limpia y con textura. Es el vaso que se pide cuando quieres algo más vivo que un refresco. Elige tamaño chico o grande.",
    ingredients: ["Chía"],
    weightGrams: 0,
    serving: "Agua fresca",
    allergens: [],
    priceCents: 2200,
    imageUrl: "/products/limon_chia.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 12,
    sizes: AGUA_SIZES,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000015",
    kind: "drink",
    name: "Pepino limón",
    description: "Verde, fresca y con un toque cítrico que quita la sed.",
    longDescription:
      "Pepino con limón: suave, aromática y muy fría. Perfecta a media mañana, entre un taco de arrachera y el siguiente. Elige vaso chico o grande.",
    ingredients: [],
    weightGrams: 0,
    serving: "Agua fresca",
    allergens: [],
    priceCents: 2200,
    imageUrl: "/products/pepino_limon.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 13,
    sizes: AGUA_SIZES,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000016",
    kind: "drink",
    name: "Carambola limón",
    description: "Exótica, ligeramente ácida, con el toque del limón local.",
    longDescription:
      "Carambola (fruta estrella) con limón: un sabor distinto al de siempre, fresco y un poco floral. Para quien quiere cambiar de la jamaica sin irse al refresco. Elige chica o grande.",
    ingredients: [],
    weightGrams: 0,
    serving: "Agua fresca",
    allergens: [],
    priceCents: 2200,
    imageUrl: "/products/carambola_limon.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 14,
    sizes: AGUA_SIZES,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000012",
    kind: "drink",
    name: "Coca-Cola de vidrio",
    description: "Envase de vidrio. Helada, para cortar el picor.",
    longDescription:
      "Coca-Cola en envase de vidrio. Helada. El clásico para cortar el picor de la adobada o el camarón.",
    ingredients: [],
    weightGrams: 500,
    serving: "Botella de vidrio",
    allergens: [],
    priceCents: 2700,
    imageUrl: "/products/coca_cola_vidrio.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 20,
  },
  {
    id: "a1a1a1a1-0001-4000-8000-000000000013",
    kind: "drink",
    name: "Coca-Cola",
    description: "Envase desechable. Para la mesa o para llevar.",
    longDescription:
      "Coca-Cola en envase desechable. Para llevar o para la mesa. Mismo sabor de siempre, lista para acompañar el pedido.",
    ingredients: [],
    weightGrams: 600,
    serving: "Botella",
    allergens: [],
    priceCents: 3300,
    imageUrl: "/products/coca_cola.webp",
    stock: 50,
    soldOut: false,
    isFeatured: false,
    sortOrder: 21,
  },
];

export function productPath(id: string) {
  return `/producto/${id}`;
}

export function relatedProducts(product: Product, catalog: Product[]) {
  return catalog.filter((item) => item.id !== product.id && item.kind === product.kind);
}

export function companionProducts(product: Product, catalog: Product[]) {
  const want: ProductKind = product.kind === "taco" ? "drink" : "taco";
  return catalog
    .filter((item) => item.kind === want)
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder);
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
