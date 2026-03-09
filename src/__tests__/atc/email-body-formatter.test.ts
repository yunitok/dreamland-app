/**
 * Tests para formatEmailBody — server-side (typeof window === "undefined"),
 * por lo que DOMPurify no se invoca y el HTML se retorna tal cual.
 */
import { formatEmailBody } from "@/modules/atc/domain/email-body-formatter"

describe("formatEmailBody", () => {
  it("retorna string vacío para input vacío", () => {
    expect(formatEmailBody("")).toBe("")
  })

  it("retorna string vacío para input con solo espacios", () => {
    expect(formatEmailBody("   \n  ")).toBe("")
  })

  it("retorna string vacío para null/undefined", () => {
    // @ts-expect-error testing null input
    expect(formatEmailBody(null)).toBe("")
    // @ts-expect-error testing undefined input
    expect(formatEmailBody(undefined)).toBe("")
  })

  it("convierte texto plano a span + br", () => {
    const result = formatEmailBody("Hola, buenas tardes")
    expect(result).toContain("<span>Hola, buenas tardes</span><br>")
  })

  it("escapa HTML peligroso", () => {
    const result = formatEmailBody('<script>alert("xss")</script>')
    expect(result).toContain("&lt;script&gt;")
    expect(result).not.toContain("<script>")
  })

  it("linkifica URLs", () => {
    const result = formatEmailBody("Visita https://example.com para más info")
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it("convierte líneas vacías en <br>", () => {
    const result = formatEmailBody("Línea 1\n\nLínea 2")
    expect(result).toContain("<br>\n<span>")
  })

  it("detecta quote headers en español", () => {
    const result = formatEmailBody("El jue, 5 mar 2026, 10:30 Juan <juan@test.com> escribió:")
    expect(result).toContain("font-style:italic")
  })

  it("detecta quote headers en inglés", () => {
    const result = formatEmailBody("On Thu, Mar 5, 2026 at 10:30 AM John <john@test.com> wrote:")
    expect(result).toContain("font-style:italic")
  })

  it("genera blockquotes para líneas con >", () => {
    const result = formatEmailBody("> Texto citado")
    expect(result).toContain("<blockquote")
    expect(result).toContain("Texto citado")
    expect(result).toContain("</blockquote>")
  })

  it("maneja múltiples niveles de cita", () => {
    const result = formatEmailBody(">> Cita nivel 2\n> Cita nivel 1")
    // Debe haber al menos 2 blockquotes abiertos
    const opens = (result.match(/<blockquote/g) || []).length
    expect(opens).toBeGreaterThanOrEqual(2)
  })

  it("cierra blockquotes al volver a texto normal", () => {
    const result = formatEmailBody("> Cita\nTexto normal")
    const opens = (result.match(/<blockquote/g) || []).length
    const closes = (result.match(/<\/blockquote>/g) || []).length
    expect(opens).toBe(closes)
  })

  it("detecta forwarded message headers", () => {
    const result = formatEmailBody("---------- Forwarded message ----------")
    expect(result).toContain("font-style:italic")
  })

  it("detecta De:/From: headers como quote headers", () => {
    const result = formatEmailBody("De: fulano@example.com")
    expect(result).toContain("font-style:italic")
  })

  it("mezcla texto normal y quoted correctamente", () => {
    const input = "Hola\n\n> Mensaje anterior\n> Segunda línea\n\nGracias"
    const result = formatEmailBody(input)

    expect(result).toContain("<span>Hola</span>")
    expect(result).toContain("<blockquote")
    expect(result).toContain("Mensaje anterior")
    expect(result).toContain("<span>Gracias</span>")
  })
})
