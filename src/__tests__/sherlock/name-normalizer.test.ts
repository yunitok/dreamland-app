import {
  normalize,
  tokenize,
  normalizeAndTokenize,
} from "@/modules/sherlock/domain/yurest-matching/name-normalizer"

describe("normalize", () => {
  it("convierte a lowercase", () => {
    expect(normalize("PAELLA VALENCIANA")).toBe("paella valenciana")
  })

  it("elimina tildes y diacríticos", () => {
    expect(normalize("Puré de patata")).toBe("patata")
  })

  it("elimina prefijos comunes de Yurest", () => {
    expect(normalize("Salsa de tomate")).toBe("tomate")
    expect(normalize("Crema de calabaza")).toBe("calabaza")
    expect(normalize("Mayonesa de ajo")).toBe("ajo")
    expect(normalize("Caldo de pollo")).toBe("pollo")
    expect(normalize("Base de pizza")).toBe("pizza")
  })

  it("solo elimina un prefijo (el primero que coincida)", () => {
    // "salsa de " se quita, no intenta quitar "base " después
    expect(normalize("Salsa de base especial")).toBe("base especial")
  })

  it("elimina caracteres no alfanuméricos", () => {
    expect(normalize("Pollo (al horno)")).toBe("pollo al horno")
  })

  it("colapsa espacios múltiples", () => {
    expect(normalize("pollo   al   ajillo")).toBe("pollo al ajillo")
  })

  it("hace trim del resultado", () => {
    expect(normalize("  ARROZ  ")).toBe("arroz")
  })

  it("maneja string vacío", () => {
    expect(normalize("")).toBe("")
  })

  it("maneja string con solo caracteres especiales", () => {
    expect(normalize("---")).toBe("")
  })
})

describe("tokenize", () => {
  it("divide por espacios", () => {
    expect(tokenize("pollo arroz")).toEqual(["pollo", "arroz"])
  })

  it("filtra stopwords", () => {
    expect(tokenize("pollo de la casa")).toEqual(["pollo", "casa"])
  })

  it("filtra tokens vacíos", () => {
    expect(tokenize("pollo  arroz")).toEqual(["pollo", "arroz"])
  })

  it("retorna array vacío para string vacío", () => {
    expect(tokenize("")).toEqual([])
  })

  it("retorna vacío si solo hay stopwords", () => {
    expect(tokenize("de la el")).toEqual([])
  })

  it("mantiene tokens significativos", () => {
    expect(tokenize("butter chicken masala")).toEqual(["butter", "chicken", "masala"])
  })
})

describe("normalizeAndTokenize", () => {
  it("normaliza y tokeniza en un solo paso", () => {
    const result = normalizeAndTokenize("Salsa de Tomate Frito")
    expect(result.normalized).toBe("tomate frito")
    expect(result.tokens).toEqual(["tomate", "frito"])
  })

  it("maneja nombre con tildes, prefijo y stopwords", () => {
    const result = normalizeAndTokenize("Puré de Patata con Mantequilla")
    // normalize conserva "con" — tokenize lo filtra como stopword
    expect(result.normalized).toBe("patata con mantequilla")
    expect(result.tokens).toEqual(["patata", "mantequilla"])
  })

  it("maneja MAYÚSCULAS de GStock", () => {
    const result = normalizeAndTokenize("BUTTER CHICKEN")
    expect(result.normalized).toBe("butter chicken")
    expect(result.tokens).toEqual(["butter", "chicken"])
  })
})
