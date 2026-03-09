import {
  normalizeForComparison,
  analyzeField,
  detectStringFields,
} from "@/modules/sherlock/domain/data-quality/analyzers"

describe("normalizeForComparison", () => {
  it("aplica trim", () => {
    expect(normalizeForComparison("  hola  ")).toBe("hola")
  })

  it("convierte a lowercase", () => {
    expect(normalizeForComparison("PAELLA")).toBe("paella")
  })

  it("elimina diacríticos", () => {
    expect(normalizeForComparison("Café crème")).toBe("cafe creme")
  })

  it("maneja string vacío", () => {
    expect(normalizeForComparison("")).toBe("")
  })

  it("combina trim + lowercase + sin diacríticos", () => {
    expect(normalizeForComparison("  PURÉ DE PATATA  ")).toBe("pure de patata")
  })
})

describe("analyzeField", () => {
  it("retorna análisis vacío para array vacío", () => {
    const result = analyzeField([], "name")
    expect(result.totalValues).toBe(0)
    expect(result.issues).toEqual([])
  })

  it("cuenta nulls correctamente", () => {
    const records = [{ id: "1", name: null }, { id: "2", name: "Test" }]
    const result = analyzeField(records, "name")
    expect(result.nullCount).toBe(1)
  })

  it("detecta strings vacíos como empty_vs_null", () => {
    const records = [{ id: "1", name: "" }]
    const result = analyzeField(records, "name")
    expect(result.emptyCount).toBe(1)
    const issue = result.issues.find(i => i.type === "empty_vs_null")
    expect(issue).toBeDefined()
    expect(issue!.severity).toBe("info")
  })

  it("detecta whitespace al inicio/final", () => {
    const records = [{ id: "1", name: "  Paella " }]
    const result = analyzeField(records, "name")
    const issue = result.issues.find(i => i.type === "leading_trailing_whitespace")
    expect(issue).toBeDefined()
    expect(issue!.suggestion).toContain("Paella")
  })

  it("detecta espacios dobles internos", () => {
    const records = [{ id: "1", name: "Pollo  al  ajillo" }]
    const result = analyzeField(records, "name")
    const issue = result.issues.find(i => i.type === "double_spaces")
    expect(issue).toBeDefined()
  })

  it("detecta caracteres especiales", () => {
    const records = [{ id: "1", name: "Pollo™ especial" }]
    const result = analyzeField(records, "name")
    const issue = result.issues.find(i => i.type === "special_characters")
    expect(issue).toBeDefined()
  })

  it("no reporta caracteres comunes como especiales", () => {
    const records = [{ id: "1", name: "Pollo (al horno) 100% casero" }]
    const result = analyzeField(records, "name")
    const issue = result.issues.find(i => i.type === "special_characters")
    expect(issue).toBeUndefined()
  })

  it("calcula caseDistribution correctamente", () => {
    const records = [
      { id: "1", name: "POLLO" },
      { id: "2", name: "arroz" },
      { id: "3", name: "Paella Valenciana" },
    ]
    const result = analyzeField(records, "name")
    expect(result.caseDistribution.allUpper).toBe(1)
    expect(result.caseDistribution.allLower).toBe(1)
    expect(result.caseDistribution.titleCase).toBe(1)
  })

  it("detecta mixed_case cuando hay varios estilos", () => {
    const records = [
      { id: "1", name: "POLLO" },
      { id: "2", name: "arroz" },
      { id: "3", name: "CARNE" },
    ]
    const result = analyzeField(records, "name")
    const mixedIssues = result.issues.filter(i => i.type === "mixed_case")
    // "arroz" es el no-dominante (allUpper es dominante con 2)
    expect(mixedIssues.length).toBeGreaterThanOrEqual(1)
  })

  it("detecta duplicados potenciales por normalización", () => {
    const records = [
      { id: "1", name: "Paella Valenciana" },
      { id: "2", name: "paella valenciana" },
    ]
    const result = analyzeField(records, "name")
    const dups = result.issues.filter(i => i.type === "potential_duplicate")
    expect(dups.length).toBeGreaterThanOrEqual(1)
    expect(dups[0].severity).toBe("critical")
  })

  it("no reporta duplicados si los originales son idénticos", () => {
    const records = [
      { id: "1", name: "Paella" },
      { id: "2", name: "Paella" },
    ]
    const result = analyzeField(records, "name")
    const dups = result.issues.filter(i => i.type === "potential_duplicate")
    expect(dups).toEqual([])
  })

  it("detecta inconsistencia de diacríticos", () => {
    const records = [
      { id: "1", name: "pure" },
      { id: "2", name: "puré" },
    ]
    const result = analyzeField(records, "name")
    const diacriticIssues = result.issues.filter(
      i => i.type === "inconsistent_diacritics" || i.type === "potential_duplicate"
    )
    expect(diacriticIssues.length).toBeGreaterThanOrEqual(1)
  })

  it("usa índice como id cuando idField no existe", () => {
    const records = [{ name: "  Test " }]
    const result = analyzeField(records, "name")
    const issue = result.issues.find(i => i.type === "leading_trailing_whitespace")
    expect(issue).toBeDefined()
    expect(issue!.recordId).toBe("0")
  })

  it("calcula uniqueValues correctamente", () => {
    const records = [
      { id: "1", name: "Pollo" },
      { id: "2", name: "Pollo" },
      { id: "3", name: "Arroz" },
    ]
    const result = analyzeField(records, "name")
    expect(result.uniqueValues).toBe(2)
  })
})

describe("detectStringFields", () => {
  it("retorna array vacío para registros vacíos", () => {
    expect(detectStringFields([])).toEqual([])
  })

  it("detecta campos string", () => {
    const records = [
      { id: "1", name: "Pollo", price: 10 },
      { id: "2", name: "Arroz", price: 5 },
    ]
    const fields = detectStringFields(records)
    expect(fields).toContain("id")
    expect(fields).toContain("name")
    expect(fields).not.toContain("price")
  })

  it("excluye campos de sistema (UUIDs)", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      id: `550e8400-e29b-41d4-a716-44665544000${i}`,
      name: `Item ${i}`,
    }))
    const fields = detectStringFields(records)
    expect(fields).not.toContain("id")
    expect(fields).toContain("name")
  })

  it("excluye campos de sistema (fechas ISO)", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      createdAt: `2026-03-0${i + 1}T10:00:00Z`,
      name: `Item ${i}`,
    }))
    const fields = detectStringFields(records)
    expect(fields).not.toContain("createdAt")
    expect(fields).toContain("name")
  })

  it("solo incluye campos con >50% de strings en la muestra", () => {
    const records = [
      { id: "1", name: "Pollo", mixed: "text" },
      { id: "2", name: "Arroz", mixed: 42 },
      { id: "3", name: "Carne", mixed: true },
      { id: "4", name: "Pescado", mixed: null },
    ]
    const fields = detectStringFields(records)
    expect(fields).toContain("name")
    // "mixed" tiene solo 1/4 strings = 25% < 50%
    expect(fields).not.toContain("mixed")
  })
})
