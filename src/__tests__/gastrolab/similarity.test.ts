import {
  levenshteinDistance,
  levenshteinSimilarity,
  jaccardTokens,
  containmentScore,
} from "@/modules/gastrolab/domain/yurest-matching/similarity"

describe("levenshteinDistance", () => {
  it("retorna 0 para strings idénticos", () => {
    expect(levenshteinDistance("paella", "paella")).toBe(0)
  })

  it("retorna longitud de b si a está vacío", () => {
    expect(levenshteinDistance("", "abc")).toBe(3)
  })

  it("retorna longitud de a si b está vacío", () => {
    expect(levenshteinDistance("abc", "")).toBe(3)
  })

  it("calcula distancia conocida (kitten/sitting = 3)", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3)
  })

  it("es simétrica (a,b) === (b,a)", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(levenshteinDistance("xyz", "abc"))
  })

  it("maneja un solo carácter de diferencia", () => {
    expect(levenshteinDistance("gato", "pato")).toBe(1)
  })

  it("maneja strings completamente diferentes", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(3)
  })
})

describe("levenshteinSimilarity", () => {
  it("retorna 1 para ambos vacíos", () => {
    expect(levenshteinSimilarity("", "")).toBe(1)
  })

  it("retorna 1 para strings idénticos", () => {
    expect(levenshteinSimilarity("paella", "paella")).toBe(1)
  })

  it("retorna 0 para strings sin coincidencia del mismo largo", () => {
    expect(levenshteinSimilarity("abc", "xyz")).toBe(0)
  })

  it("retorna valor entre 0 y 1 para similitud parcial", () => {
    const sim = levenshteinSimilarity("paella", "paela")
    expect(sim).toBeGreaterThan(0)
    expect(sim).toBeLessThan(1)
  })

  it("strings más similares tienen score más alto", () => {
    const high = levenshteinSimilarity("butter chicken", "butter chicke")
    const low = levenshteinSimilarity("butter chicken", "ensalada cesar")
    expect(high).toBeGreaterThan(low)
  })
})

describe("jaccardTokens", () => {
  it("retorna 1 para ambos vacíos", () => {
    expect(jaccardTokens([], [])).toBe(1)
  })

  it("retorna 0 si solo uno está vacío", () => {
    expect(jaccardTokens(["a"], [])).toBe(0)
    expect(jaccardTokens([], ["a"])).toBe(0)
  })

  it("retorna 1 para conjuntos idénticos", () => {
    expect(jaccardTokens(["pollo", "arroz"], ["pollo", "arroz"])).toBe(1)
  })

  it("retorna 0 para conjuntos sin intersección", () => {
    expect(jaccardTokens(["pollo", "arroz"], ["ternera", "pasta"])).toBe(0)
  })

  it("calcula correctamente intersección parcial", () => {
    // A = {pollo, arroz, cebolla}, B = {pollo, cebolla, tomate}
    // Intersección = 2, Unión = 4 → 2/4 = 0.5
    const result = jaccardTokens(["pollo", "arroz", "cebolla"], ["pollo", "cebolla", "tomate"])
    expect(result).toBe(0.5)
  })

  it("ignora duplicados por usar Set internamente", () => {
    const result = jaccardTokens(["pollo", "pollo"], ["pollo"])
    expect(result).toBe(1)
  })
})

describe("containmentScore", () => {
  it("retorna 1 para ambos vacíos", () => {
    expect(containmentScore([], [])).toBe(1)
  })

  it("retorna 0 si uno está vacío", () => {
    expect(containmentScore(["a"], [])).toBe(0)
    expect(containmentScore([], ["a"])).toBe(0)
  })

  it("retorna 1 si el set menor está completamente contenido en el mayor", () => {
    expect(containmentScore(["butter", "chicken"], ["salsa", "butter", "chicken", "curry"])).toBe(1)
  })

  it("calcula score parcial cuando hay contención parcial", () => {
    // menor = ["butter", "tomate"] (2 items), mayor = ["butter", "chicken"]
    // contenidos = 1 → 1/2 = 0.5
    expect(containmentScore(["butter", "tomate"], ["butter", "chicken"])).toBe(0.5)
  })

  it("usa siempre el set más pequeño como referencia", () => {
    // A (3 items) > B (2 items) → B es el menor
    // B = ["butter", "chicken"], A = ["butter", "chicken", "curry"]
    // todos los de B están en A → 1.0
    expect(containmentScore(["butter", "chicken", "curry"], ["butter", "chicken"])).toBe(1)
  })
})
