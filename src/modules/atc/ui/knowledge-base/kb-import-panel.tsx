// Thin wrapper — el componente real vive en src/modules/rag/ui/kb-import-panel.tsx
// Se mantiene para backward compatibility de imports existentes.
"use client"

import { KBImportPanel as RagKBImportPanel } from "@/modules/rag/ui/kb-import-panel"
import type { QueryCategory } from "@prisma/client"

interface KBImportPanelProps {
  categories: QueryCategory[]
}

export function KBImportPanel({ categories }: KBImportPanelProps) {
  return <RagKBImportPanel domain="atc" categories={categories} />
}
