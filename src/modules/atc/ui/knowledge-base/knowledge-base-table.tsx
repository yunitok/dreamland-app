// Thin wrapper — el componente real vive en src/modules/rag/ui/knowledge-base-table.tsx
// Se mantiene para backward compatibility de imports existentes.
"use client"

import { KnowledgeBaseTable as RagKBTable } from "@/modules/rag/ui/knowledge-base-table"
import type { KnowledgeBase, QueryCategory } from "@prisma/client"

interface KBTableProps {
  data: KnowledgeBase[]
  categories: QueryCategory[]
}

export function KnowledgeBaseTable({ data, categories }: KBTableProps) {
  return <RagKBTable data={data} domain="atc" categories={categories} />
}
