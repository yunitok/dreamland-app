// Thin wrapper — toda la logica se ha movido a src/modules/rag/
// Este archivo se mantiene para backward compatibility de imports existentes.
export {
  computeContentHash,
  bulkImportKBCore,
  syncKBBySourceCore,
} from "@/modules/rag/actions/knowledge-base-core"

export type { BulkKBEntry } from "@/modules/rag/domain/types"
