import DOMPurify from "dompurify"

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g

const QUOTE_HEADER_PATTERNS = [
  // "El jue, 5 mar 2026, 10:30 Fulano <email> escribió:"
  /^(El\s+\w{2,4},?\s+\d{1,2}\s+\w{3,10}\.?\s+\d{4}.*?escribi[oó]:?\s*)$/i,
  // "On Thu, Mar 5, 2026 at 10:30 AM Fulano <email> wrote:"
  /^(On\s+\w{3},?\s+\w{3}\s+\d{1,2},?\s+\d{4}.*?wrote:?\s*)$/i,
  // "---------- Forwarded message ----------"
  /^-{3,}\s*(Forwarded message|Mensaje reenviado|Mensaje reenv)\s*-{3,}\s*$/i,
  // "De: fulano@..." or "From: fulano@..."
  /^(De|From|Fecha|Date|Para|To|Asunto|Subject|Cc|CC):\s+.+$/i,
]

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function linkifyText(text: string): string {
  return text.replace(URL_REGEX, (url) => {
    const escaped = escapeHtml(url)
    return `<a href="${escaped}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">${escaped}</a>`
  })
}

function isQuoteHeader(line: string): boolean {
  return QUOTE_HEADER_PATTERNS.some((pattern) => pattern.test(line.trim()))
}

function getQuoteDepth(line: string): { depth: number; content: string } {
  let depth = 0
  let content = line
  while (content.startsWith(">")) {
    depth++
    content = content.slice(1)
    if (content.startsWith(" ")) content = content.slice(1)
  }
  return { depth, content }
}

// Differentiated styles per nesting depth — lighter colors for deeper quotes
// Contrast ratios on white: depth1 ~10:1, depth2 ~7:1, depth3+ ~5.5:1 (all WCAG AA)
const BLOCKQUOTE_STYLES: Record<number, string> = {
  1: "border-left:3px solid #93c5fd;padding-left:12px;margin:8px 0;color:#374151;font-size:0.875rem;background:rgba(219,234,254,0.3);border-radius:4px;padding:8px 12px;",
  2: "border-left:3px solid #c4b5fd;padding-left:12px;margin:8px 0;color:#4b5563;font-size:0.85rem;background:rgba(237,233,254,0.25);border-radius:4px;padding:8px 12px;",
  3: "border-left:3px solid #d1d5db;padding-left:12px;margin:8px 0;color:#6b7280;font-size:0.825rem;background:rgba(243,244,246,0.2);border-radius:4px;padding:8px 12px;",
}

function getBlockquoteStyle(depth: number): string {
  return BLOCKQUOTE_STYLES[Math.min(depth, 3)]
}

const QUOTE_HEADER_STYLE =
  "color:#6b7280;font-size:0.75rem;padding:8px 0 4px;border-top:1px solid #e5e7eb;margin-top:12px;font-style:italic;"

export function formatEmailBody(rawText: string): string {
  if (!rawText || !rawText.trim()) return ""

  const lines = rawText.split("\n")
  const htmlParts: string[] = []
  let currentQuoteDepth = 0
  let inQuoteBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const { depth, content } = getQuoteDepth(line)

    // Quote header line (not prefixed with >)
    if (depth === 0 && isQuoteHeader(line)) {
      // Close any open blockquotes
      while (currentQuoteDepth > 0) {
        htmlParts.push("</blockquote>")
        currentQuoteDepth--
      }
      inQuoteBlock = false
      htmlParts.push(
        `<div style="${QUOTE_HEADER_STYLE}">${linkifyText(escapeHtml(line.trim()))}</div>`
      )
      continue
    }

    if (depth > 0) {
      // Adjust blockquote nesting
      while (currentQuoteDepth < depth) {
        currentQuoteDepth++
        htmlParts.push(`<blockquote style="${getBlockquoteStyle(currentQuoteDepth)}">`)
      }
      while (currentQuoteDepth > depth) {
        htmlParts.push("</blockquote>")
        currentQuoteDepth--
      }
      inQuoteBlock = true

      // Check if quoted line is itself a quote header
      if (isQuoteHeader(content)) {
        htmlParts.push(
          `<div style="${QUOTE_HEADER_STYLE}">${linkifyText(escapeHtml(content.trim()))}</div>`
        )
      } else {
        const trimmed = content.trim()
        if (trimmed === "") {
          htmlParts.push("<br>")
        } else {
          htmlParts.push(`<span>${linkifyText(escapeHtml(trimmed))}</span><br>`)
        }
      }
    } else {
      // Close any open blockquotes when returning to depth 0
      if (inQuoteBlock) {
        while (currentQuoteDepth > 0) {
          htmlParts.push("</blockquote>")
          currentQuoteDepth--
        }
        inQuoteBlock = false
      }

      // Normal line
      const trimmed = line.trim()
      if (trimmed === "") {
        htmlParts.push("<br>")
      } else {
        htmlParts.push(`<span>${linkifyText(escapeHtml(trimmed))}</span><br>`)
      }
    }
  }

  // Close any remaining open blockquotes
  while (currentQuoteDepth > 0) {
    htmlParts.push("</blockquote>")
    currentQuoteDepth--
  }

  const html = htmlParts.join("\n")

  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["br", "span", "a", "blockquote", "div"],
      ALLOWED_ATTR: ["href", "target", "rel", "style"],
    })
  }

  // Server-side: return as-is (already escaped)
  return html
}
