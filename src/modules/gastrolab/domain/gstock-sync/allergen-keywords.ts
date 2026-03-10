import { AllergenType } from "@prisma/client"

// Map of AllergenType to Spanish ingredient name keywords (lowercase, normalized)
export const ALLERGEN_KEYWORDS: Record<AllergenType, string[]> = {
  GLUTEN: [
    "trigo", "harina", "pan", "centeno", "cebada", "avena", "espelta",
    "sémola", "semola", "cuscús", "cuscus", "pasta", "galleta", "croissant",
    "hojaldre", "bizcocho", "empanado",
  ],
  CRUSTACEOS: [
    "gamba", "langostino", "cangrejo", "bogavante", "cigala", "camarón",
    "camaron", "nécora", "necora", "percebes", "langosta", "buey de mar",
  ],
  HUEVOS: [
    "huevo", "yema", "clara", "mayonesa", "merengue", "tortilla", "rebozado",
  ],
  PESCADO: [
    "salmón", "salmon", "bacalao", "merluza", "atún", "atun", "anchoa",
    "sardina", "lubina", "dorada", "rape", "lenguado", "boquerón", "boqueron",
    "bonito", "caballa", "rodaballo", "halibut", "trucha", "pez espada",
    "mero", "san pedro",
  ],
  CACAHUETES: ["cacahuete", "maní", "mani", "peanut"],
  SOJA: [
    "soja", "tofu", "edamame", "tamari", "miso", "tempeh",
    "proteína de soja", "proteina de soja",
  ],
  LACTEOS: [
    "leche", "nata", "queso", "mantequilla", "yogur", "crema", "suero",
    "requesón", "requeson", "mascarpone", "mozzarella", "parmesano", "ricotta",
    "brie", "camembert", "gruyère", "gruyere", "gorgonzola",
  ],
  FRUTOS_SECOS: [
    "almendra", "nuez", "avellana", "pistacho", "anacardo", "piñón", "pinon",
    "macadamia", "pecan", "pecán", "caju",
  ],
  APIO: ["apio"],
  MOSTAZA: ["mostaza"],
  SESAMO: ["sésamo", "sesamo", "tahini"],
  DIOXIDO_AZUFRE: ["sulfito", "sulfitos", "vino", "vinagre", "mosto"],
  ALTRAMUCES: ["altramuz", "altramuces", "lupino", "lupina"],
  MOLUSCOS: [
    "mejillón", "mejillon", "calamar", "pulpo", "sepia", "ostra", "almeja",
    "berberecho", "vieira", "navaja", "chipirón", "chipiron", "caracol",
    "caracoles de mar",
  ],
}

// Normalize a string for keyword matching: lowercase + remove diacritics
const normalizeForMatch = (text: string): string =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

// Infer allergens from a single ingredient name
export const inferAllergensFromIngredientName = (name: string): AllergenType[] => {
  const normalized = normalizeForMatch(name)
  const found: AllergenType[] = []

  for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS) as [AllergenType, string[]][]) {
    const matches = keywords.some((kw) => normalized.includes(normalizeForMatch(kw)))
    if (matches) found.push(allergen)
  }

  return found
}

// Infer allergens from a list of ingredient names, deduplicated
export const inferAllergensForRecipe = (ingredientNames: string[]): AllergenType[] => {
  const allergenSet = new Set<AllergenType>()

  for (const name of ingredientNames) {
    for (const allergen of inferAllergensFromIngredientName(name)) {
      allergenSet.add(allergen)
    }
  }

  return Array.from(allergenSet)
}

// Merge GStock-provided allergens with inferred ones (preserves GStock values, inferred adds what's missing)
export const mergeAllergens = (
  fromGstock: AllergenType[],
  inferred: AllergenType[],
): AllergenType[] => {
  const merged = new Set<AllergenType>([...fromGstock, ...inferred])
  return Array.from(merged)
}
