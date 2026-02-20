---
title: Knowledge Base — Gestión de Conocimiento
description: Importación, normalización, deduplicación y gestión de la base de conocimiento RAG
---

# 📚 Knowledge Base

## ¿Qué es la Knowledge Base?

La **Knowledge Base (KB)** es el repositorio de información estructurada que alimenta el motor RAG del asistente ATC. Cada entrada representa un fragmento de conocimiento (chunk) sobre el restaurante: horarios, menús, alérgenos, espacios, políticas, etc.

Cada chunk se almacena en **dos lugares**:
1. **PostgreSQL** (`knowledge_base` table) — texto completo, metadatos, hash de deduplicación
2. **Pinecone** (vector index) — embedding numérico para búsqueda semántica

Ambos deben mantenerse sincronizados. Las server actions garantizan que cualquier operación (crear, actualizar, activar/desactivar, eliminar) se refleja en los dos sistemas.

---

## 📐 Modelo de Datos

```prisma
model KnowledgeBase {
  id          String   @id @default(cuid())
  title       String                        // Título descriptivo del chunk
  content     String                        // Contenido del chunk (≤ 400 tokens)
  contentHash String?                       // SHA-256 de title+content normalizado
  categoryId  String?                       // → QueryCategory
  section     String?                       // Subsección del documento
  source      String   @default("manual")   // manual | staged | file | excel | gstock | n8n
  language    String   @default("es")       // es | en | de | fr | it | ru
  active      Boolean  @default(true)       // false = excluido de las búsquedas
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([contentHash, source, language])  // Deduplicación
  @@index([categoryId])
  @@index([active])
  @@index([source])
  @@index([language])
}
```

### Campo `contentHash` — Deduplicación

El hash se calcula con SHA-256 sobre el contenido normalizado:

```typescript
// src/modules/atc/actions/knowledge-base.ts
function computeContentHash(title: string, content: string): string {
  const normalized = `${title.trim().toLowerCase()}||${content.trim().toLowerCase()}`
  return createHash("sha256").update(normalized).digest("hex")
}
```

El índice único `@@unique([contentHash, source, language])` garantiza que el mismo contenido no puede duplicarse dentro del mismo source e idioma. Esto permite que la misma información exista en `source: "es"` y `source: "en"` (traducciones).

---

## 🔄 Pipeline de Importación

### Flujo completo

```
Archivo / Texto
      │
      ▼
┌─────────────────────────────────────────┐
│  Fase 1: Parsing                        │
│  /api/atc/knowledge-base/parse-file     │
│  ─ Excel → SheetJS → ParsedSection[]   │
│  ─ PDF   → pdf-parse → ParsedSection[] │
│  ─ CSV   → nativo → ParsedSection[]    │
└────────────────────────┬────────────────┘
                         │ ParsedSection[]
                         ▼
┌─────────────────────────────────────────┐
│  Fase 2: Normalización IA               │
│  /api/atc/knowledge-base/normalize      │
│  ─ GPT-4o-mini via OpenRouter           │
│  ─ Divide en chunks ≤ 400 tokens       │
│  ─ Sugiere título, sección, categoría  │
│  ─ Detecta idioma                       │
└────────────────────────┬────────────────┘
                         │ StagedEntry[]
                         ▼
┌─────────────────────────────────────────┐
│  Fase 3: Revisión manual                │
│  UI: editar título, sección, categoría  │
│  Seleccionar/deseleccionar chunks       │
│  Toggle "Reemplazar importación ant."   │
└────────────────────────┬────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────┐
│  Fase 4: Publicación                    │
│  publishStagedEntries() en lotes de 10  │
│  ─ Genera embeddings (batch API)        │
│  ─ Upsert en PostgreSQL con contentHash │
│  ─ Upsert vectores en Pinecone          │
└─────────────────────────────────────────┘
```

---

## 📂 Formatos de Archivo Soportados

### Excel (.xlsx / .xls)

- **Librería**: SheetJS (`xlsx`)
- **Estructura**: 1 sección = 1 hoja del libro
- **Datos extraídos**: headers, rows como `Record<string, string>[]`
- **Formato al normalizar**: `- Header: valor` por fila
- **Tamaño máximo**: 5MB

> **Limitación**: Las imágenes, gráficos y drawing objects de Google Sheets/Excel no se extraen. Si el archivo contiene información en imágenes (ej: horarios como captura de pantalla), debe pegarse manualmente en la pestaña "Texto".

### PDF (.pdf)

- **Librería**: `pdf-parse`
- **Estructura**:
  - PDF ≤ 10 páginas → 1 sección = documento completo
  - PDF > 10 páginas → dividido en bloques de ~5.000 chars con corte en párrafo natural
- **Datos extraídos**: texto plano de todas las capas de texto
- **Tamaño máximo**: 10MB

> **Limitación**: Solo extrae texto de capas PDF. PDFs escaneados (imágenes sin OCR) producirán secciones vacías.

### CSV (.csv)

- **Librería**: Parser nativo (sin dependencia externa)
- **Estructura**: 1 sección = archivo completo
- **Datos extraídos**: headers de la primera fila, rows como tabla
- **Soporte**: valores con comillas, comas escapadas
- **Tamaño máximo**: 5MB

---

## 🧠 Normalización con IA

### API: `POST /api/atc/knowledge-base/normalize`

El endpoint recibe texto libre (o texto formateado desde un archivo) y lo estructura en chunks:

```typescript
// Request
{ text: string, source?: "excel" | "file" | undefined }

// Response
{
  entries: Array<{
    title: string
    section: string
    content: string
    categorySuggestion: string   // "espacios" | "menus" | "horarios" | ...
    language: string             // "es" | "en" | ...
    tokenCount: number
  }>
}
```

### System Prompt

El LLM recibe instrucciones para:
1. Dividir en chunks de **máximo 400 tokens**
2. Generar un título claro y descriptivo
3. Identificar la sección temática
4. Sugerir una de las 11 categorías predefinidas
5. Generar un chunk separado por idioma si detecta contenido multilingüe
6. Anonimizar datos personales (emails → `[EMAIL]`, teléfonos → `[TELÉFONO]`)

Cuando `source: "file"`, se añade contexto extra al prompt explicando que el contenido puede venir de Excel (filas formateadas) o PDF (texto continuo).

### Resolución de Categorías

La sugerencia del LLM es un string en español (`"reservas"`, `"menus"`) que se mapea a un UUID de base de datos:

```typescript
// src/modules/atc/ui/knowledge-base/kb-import-panel.tsx
const SUGGESTION_TO_CODE: Record<string, string> = {
  espacios: "SPACES",      alergenos: "ALLERGENS",
  accesibilidad: "ACCESSIBILITY",  horarios: "SCHEDULES",
  menus: "MENUS",          politicas: "POLICIES",
  general: "GENERAL",      reservas: "RESERVATIONS",
  pagos: "PAYMENTS",       eventos: "EVENTS",
  incidencias: "INCIDENTS",
}

function resolveCategoryId(suggestion: string, categories: QueryCategory[]): string | undefined {
  const code = SUGGESTION_TO_CODE[suggestion.toLowerCase().trim()]
  return categories.find(c => c.code === code)?.id
}
```

---

## 🔒 Deduplicación

### Funcionamiento

Al importar en lote (`bulkImportKnowledgeBaseEntries`), el sistema:

1. Calcula el `contentHash` para cada entrada
2. Consulta la DB por hashes existentes con el mismo `source` e idioma
3. Filtra las entradas ya existentes → solo procesa las nuevas
4. Genera embeddings **solo** para las entradas nuevas (ahorro de API calls)
5. Persiste en DB con hash y sube vectores a Pinecone

```typescript
// Deduplicación en bulk import
const existingSet = new Set(existing.map(e => `${e.contentHash}|${e.source}|${e.language}`))
indicesToProcess = indicesToProcess.filter(i => {
  const key = `${hashes[i]}|${entries[i].source ?? "n8n"}|${entries[i].language ?? "es"}`
  return !existingSet.has(key)
})
```

### Modo Reemplazo

El toggle "Reemplazar importación anterior" en la UI elimina todas las entradas del mismo `source` antes de publicar, actualizando así el contenido:

```typescript
// handlePublish en kb-import-panel.tsx
if (replaceMode) {
  await deleteKnowledgeBaseBySource(source)  // Borra DB + Pinecone
}
await publishStagedEntries(batch, source)
```

---

## 🗑️ Borrado y Limpieza

### Borrado individual
Elimina el vector de Pinecone antes de borrar el registro en DB para evitar inconsistencias:

```typescript
export async function deleteKnowledgeBaseEntry(id: string) {
  await deleteKnowledgeVectors([id])  // Pinecone primero
  await prisma.knowledgeBase.delete({ where: { id } })
}
```

### Borrado masivo por source
Disponible desde la tabla KB via el dropdown "Borrado masivo":

```typescript
export async function deleteKnowledgeBaseBySource(source: string) {
  await deleteVectorsBySource(source)           // Filtro en Pinecone por metadata.source
  await prisma.knowledgeBase.deleteMany({ where: { source } })
}
```

> **Nota**: Los sources `"manual"` no aparecen en el dropdown de borrado masivo para prevenir eliminación accidental.

---

## ⚡ Publicación por Lotes

Para evitar timeouts en server actions con muchas entradas, la publicación se procesa en **lotes de 10**:

```typescript
// kb-import-panel.tsx — handlePublish
const BATCH_SIZE = 10
for (let i = 0; i < toPublish.length; i += BATCH_SIZE) {
  const batch = toPublish.slice(i, i + BATCH_SIZE)
  await publishStagedEntries(batch.map(e => ({ ... })), source)
  setProgress({ current: Math.min(i + BATCH_SIZE, toPublish.length), total: toPublish.length })
}
```

Cada lote genera embeddings en batch (API call único para 10 entradas), hace upsert en DB y en Pinecone.

---

## 🔌 Integración n8n / Webhook

### Sync GStock: `POST /api/atc/knowledge-base/sync-gstock`

Endpoint protegido con `x-n8n-secret` para actualización completa del source `"gstock"`:

```typescript
// Autenticación: header x-n8n-secret debe coincidir con N8N_WEBHOOK_SECRET
// Body: { entries: BulkKBEntry[] }
// Operación: DELETE all gstock → INSERT nuevos → Embed → Upsert Pinecone
```

Este endpoint implementa una **sincronización full-replace**: borra todos los vectores y entradas anteriores del source y los reemplaza. Garantiza que la información siempre esté actualizada.

### Import genérico n8n: `POST /api/atc/knowledge-base/import`

Para importaciones incrementales con deduplicación automática (sin borrar datos previos).

---

## 🔧 Backfill de contentHash

Si hay entradas existentes sin `contentHash`, ejecutar el script de backfill:

```bash
npx tsx scripts/backfill-content-hash.ts
```

El script usa el mismo `computeContentHash()` que las server actions y actualiza en masa. Las entradas duplicadas (mismo hash) se reportan pero no se eliminan automáticamente.

---

## 📊 Variables de Entorno Necesarias

```bash
DATABASE_URL=           # PostgreSQL connection string
DIRECT_URL=             # Directa para migraciones (Supabase)
OPENROUTER_API_KEY=     # Para normalización con GPT-4o-mini
AI_CHAT_MODEL=          # Modelo a usar (default: openai/gpt-4o-mini)
PINECONE_API_KEY=       # API key de Pinecone
PINECONE_INDEX_NAME=    # Nombre del índice (default: dreamland-atc)
N8N_WEBHOOK_SECRET=     # Secreto para autenticar webhooks n8n
```
