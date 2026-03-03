"use server"

// Thin wrappers — toda la logica RAG se ha movido a src/modules/rag/
// Estas funciones mantienen la interfaz original de ATC para backward compatibility.
import {
  getKBEntries,
  createKBEntry,
  updateKBEntry,
  toggleKBEntry,
  deleteKBEntry,
  bulkImportKBEntries,
  syncKBBySource,
  publishStagedKBEntries,
  deleteKBBySource,
} from "@/modules/rag/actions/knowledge-base"
import type { KnowledgeBaseFormValues } from "@/modules/rag/domain/schemas"
import type { BulkKBEntry } from "@/modules/rag/domain/types"
// Asegurar registro de dominios
import "@/modules/rag/domain/register-domains"

const DOMAIN = "atc"

export async function getKnowledgeBaseEntries(filters?: {
  categoryId?: string
  source?: string
  active?: boolean
}) {
  return getKBEntries(DOMAIN, filters)
}

export async function createKnowledgeBaseEntry(formData: KnowledgeBaseFormValues) {
  return createKBEntry(DOMAIN, formData)
}

export async function updateKnowledgeBaseEntry(id: string, formData: KnowledgeBaseFormValues) {
  return updateKBEntry(DOMAIN, id, formData)
}

export async function toggleKnowledgeBaseEntry(id: string, active: boolean) {
  return toggleKBEntry(DOMAIN, id, active)
}

export async function deleteKnowledgeBaseEntry(id: string) {
  return deleteKBEntry(DOMAIN, id)
}

export async function bulkImportKnowledgeBaseEntries(
  entries: BulkKBEntry[],
  skipDuplicates = true
) {
  return bulkImportKBEntries(DOMAIN, entries, skipDuplicates)
}

export async function syncKnowledgeBaseBySource(
  source: string,
  entries: BulkKBEntry[]
) {
  return syncKBBySource(DOMAIN, source, entries)
}

export async function publishStagedEntries(entries: BulkKBEntry[], source = "staged") {
  return publishStagedKBEntries(DOMAIN, entries, source)
}

export async function deleteKnowledgeBaseBySource(source: string) {
  return deleteKBBySource(DOMAIN, source)
}
