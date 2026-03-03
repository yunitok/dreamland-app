// Thin wrapper — el componente real vive en src/modules/rag/ui/knowledge-base-dialog.tsx
// Se mantiene para backward compatibility de imports existentes.
"use client"

import { KnowledgeBaseDialog as RagKBDialog } from "@/modules/rag/ui/knowledge-base-dialog"
import type { KnowledgeBase, QueryCategory } from "@prisma/client"

interface KnowledgeBaseDialogProps {
  categories: QueryCategory[]
  entry?: KnowledgeBase
  mode?: "create" | "edit"
}

export function KnowledgeBaseDialog({ categories, entry, mode }: KnowledgeBaseDialogProps) {
  return <RagKBDialog domain="atc" categories={categories} entry={entry} mode={mode} />
}
