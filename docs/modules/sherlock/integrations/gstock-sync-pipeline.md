---
title: Pipeline de Sincronización GStock → Sherlock → RAG
description: Documentación completa del proceso de sincronización de recetas, ingredientes y catálogo desde GStock, incluyendo arquitectura, fases, idempotencia y generación de KB para el chatbot ATC.
---

# 🔄 Pipeline de Sincronización GStock → Sherlock → RAG

## Resumen

El pipeline de sincronización importa automáticamente datos de **GStock** (recetas, ingredientes, catálogo) a la base de datos de Sherlock y genera entradas en el Knowledge Base vectorial para que el **chatbot ATC** pueda responder preguntas sobre alérgenos e ingredientes de los platos.

```
GStock API → Sherlock DB (Prisma) → Pinecone (RAG)
```

---

## 🗂️ Archivos Clave

| Archivo | Responsabilidad |
|---------|----------------|
| `src/lib/gstock.ts` | Cliente HTTP OAuth2 (`fetchGstock<T>`, `getGstockToken`) |
| `src/modules/sherlock/domain/gstock-sync/types.ts` | Interfaces TypeScript de respuesta GStock |
| `src/modules/sherlock/domain/gstock-sync/mappers.ts` | Funciones puras GStock → Prisma data |
| `src/modules/sherlock/domain/gstock-sync/allergen-keywords.ts` | Inferencia de alérgenos por keywords en nombres de ingredientes |
| `src/modules/sherlock/domain/gstock-sync/kb-generator.ts` | Generación de entradas KB para el chatbot RAG |
| `src/modules/sherlock/domain/gstock-sync/sync-orchestrator.ts` | Orquestador de las 8 fases + lógica de upsert |
| `src/modules/sherlock/actions/gstock-sync.ts` | Server actions con RBAC (`runGstockSync`, `resetGstockData`) |
| `scripts/sync-gstock-recipes.ts` | Script CLI para ejecución manual/cron |
| `src/app/[locale]/(dashboard)/sherlock/settings/_components/gstock-sync-card.tsx` | UI de sincronización en Sherlock › Settings |

---

## ⚙️ Fases de Sincronización

El orquestador ejecuta **8 fases en orden**, respetando las dependencias de foreign keys:

```
Fase 1: MeasureUnit     ←── sin dependencias externas
Fase 2: Category        ←── sin dependencias externas (jerarquía self-ref resuelta en batch)
Fase 3: RecipeCategory  ←── sin dependencias externas
Fase 4: RecipeFamily    ←── sin dependencias externas
Fase 5: Supplier        ←── sin dependencias externas
Fase 6: Ingredient      ←── depende de MeasureUnit, Category, Supplier
Fase 7: Recipe + RecipeIngredient ←── depende de RecipeCategory, RecipeFamily, Ingredient, MeasureUnit
Fase 8: KnowledgeBase (RAG) ←── depende de Recipe + Ingredient (usa datos sincronizados)
```

### Detalles por fase

| Fase | Endpoint GStock | Modelo Prisma | Upsert por |
|------|----------------|---------------|-----------|
| 1 | `v1/product/purchases/units/measure` | `MeasureUnit` | `gstockId` |
| 2 | `v1/product/purchases/categories` | `Category` | `gstockId` |
| 3 | `v1/recipes/categories` | `RecipeCategory` | `gstockId` |
| 4 | `v1/recipes/families` | `RecipeFamily` | `gstockId` |
| 5 | `v1/suppliers` | `Supplier` | `gstockId` |
| 6 | `v1/product/purchases` | `Ingredient` | `reference` (GStock ID numérico) |
| 7 | `v2/recipes` | `Recipe` + `RecipeIngredient` | `externalId` + recreación de líneas |
| 8 | *(local)* | `KnowledgeBase` + Pinecone | `syncKBBySourceCore("gstock-recipes")` |

---

## 🔑 Idempotencia: Campo `gstockId`

Todos los modelos de catálogo almacenan el ID numérico de GStock en el campo `gstockId: String? @unique`. Esto garantiza que re-sincronizaciones siempre actualicen el registro correcto, **independientemente de cambios de nombre o casing en GStock**.

### Campos de trazabilidad por modelo

| Modelo | Campo | Valor |
|--------|-------|-------|
| `MeasureUnit` | `gstockId` | `String(gstock.id)` |
| `Category` | `gstockId` | `String(gstock.id)` |
| `RecipeCategory` | `gstockId` | `String(gstock.id)` |
| `RecipeFamily` | `gstockId` | `String(gstock.id)` |
| `Supplier` | `gstockId` | `String(gstock.id)` |
| `Ingredient` | `reference` | `String(gstock.id)` |
| `Recipe` | `externalId` + `externalSource` | `String(gstock.id)` + `"gstock"` |

> **Nota:** GStock devuelve IDs como enteros (`Int`). Se convierten a `String` en todos los puntos de contacto con Prisma y los mapas de ID.

---

## 🌿 Particularidades de la API GStock

### Unidades de medida
El endpoint `v1/product/purchases/units/measure` devuelve solo `{ id, name }` sin campo de abreviatura dedicado. Los nombres (`"gr"`, `"KG"`, `"ml"`, `"ud"`, `"LITRO"`) actúan ellos mismos como abreviatura, por lo que el sync usa:

```typescript
const abbreviation = extractAbbreviation(raw) ?? raw.name
```

`extractAbbreviation` comprueba los campos `abbreviation`, `abbr`, `symbol` y `shortName` antes de caer en el fallback.

### IDs numéricos
GStock usa IDs enteros, no UUIDs. El tipo `GstockId = string | number` cubre ambos casos y siempre se convierte a `String` antes de usarlo como clave de mapa o valor Prisma.

### Recetas con ingredientes
Las recetas en `v2/recipes` incluyen las líneas de ingredientes en el objeto `ingredients[]`. El sync borra y recrea los `RecipeIngredient` en cada re-sync (ya que GStock no devuelve IDs de línea individuales):

```typescript
await prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } })
await prisma.recipeIngredient.createMany({ data: lines })
```

---

## 🧬 Inferencia de Alérgenos

Si GStock no devuelve alérgenos en una receta, el sistema infiere posibles alérgenos analizando los nombres de los ingredientes mediante un mapa de keywords:

```typescript
// allergen-keywords.ts
GLUTEN: ["trigo", "harina", "pan", "centeno", "cebada", "pasta", ...]
LACTEOS: ["leche", "nata", "queso", "mantequilla", "yogur", ...]
PESCADO: ["salmón", "bacalao", "merluza", "atún", "anchoa", ...]
// ... 14 alérgenos de declaración obligatoria
```

Los alérgenos de GStock tienen prioridad; los inferidos se añaden como complemento (`mergeAllergens`).

---

## 📚 Generación de KB para el Chatbot (Fase 8)

Por cada receta sincronizada se generan **2 entradas KB**:

### Ficha de receta (`section: "Recetas"`)
```
title: "Receta: Paella Valenciana"
content: "Plato de la categoría Arroces. Ingredientes: arroz bomba (400 gr),
pollo (300 gr), judía verde (100 gr)... Coste teórico: 24,50 €."
source: "gstock-recipes"
```

### Ficha de alérgenos (`section: "Alérgenos"`)
```
title: "Alérgenos: Paella Valenciana"
content: "La Paella Valenciana no contiene alérgenos declarados entre los 14
alérgenos de declaración obligatoria. Ingredientes: arroz bomba, pollo..."
source: "gstock-recipes"
```

Además se generan **entradas resumen por alérgeno**:
```
title: "Platos sin gluten"
content: "Los siguientes platos no contienen GLUTEN: Paella Valenciana,
Gazpacho Andaluz... NOTA: esta información se basa en los ingredientes registrados."
```

Todas las entradas se sincronizan con Pinecone usando `syncKBBySourceCore("gstock-recipes")`, que elimina las entradas anteriores de esa fuente antes de insertar las nuevas.

---

## 🚀 Cómo Ejecutar el Sync

### Desde la UI (Sherlock › Settings)

1. Navegar a `Sherlock › Configuración`
2. En el card **Sincronización GStock**, activar/desactivar el toggle "Incluir generación KB para chatbot"
3. Pulsar **Sincronizar con GStock**
4. El resultado muestra registros creados, actualizados y errores si los hay

### Desde la CLI

```bash
# Sync completo (DB + RAG)
npx tsx scripts/sync-gstock-recipes.ts

# Solo sync de DB (sin generar KB entries)
npx tsx scripts/sync-gstock-recipes.ts --skip-kb

# Dry-run (muestra qué haría sin escribir)
npx tsx scripts/sync-gstock-recipes.ts --dry-run

# Con logging detallado
npx tsx scripts/sync-gstock-recipes.ts --verbose
```

### Variables de entorno requeridas

```bash
GSTOCK_API_URL=https://tu-instancia.gstock.es/external/api
GSTOCK_CLIENT_ID=tu_client_id
GSTOCK_CLIENT_SECRET=tu_client_secret
```

---

## 🔒 Permisos

| Operación | Permiso requerido |
|-----------|------------------|
| Ver info de sync (última fecha, nº entries) | `sherlock:read` |
| Ejecutar sincronización | `sherlock:manage` |
| Borrar todos los datos GStock | `SUPER_ADMIN` (verificado en servidor) |

---

## 🗑️ Reset de Datos GStock (SUPER_ADMIN)

El botón **"Borrar todos los datos de GStock"** (visible solo para `SUPER_ADMIN` en el card de Settings) ejecuta la acción `resetGstockData()`, que elimina en el orden correcto:

```
1. KnowledgeBase entries  (source = "gstock-recipes")
2. RecipeIngredient       (líneas de ingredientes GStock en recetas manuales)
3. Recipe                 (externalSource = "gstock") → cascade borra sus RecipeIngredients
4. Ingredient             (reference IS NOT NULL)
5. Category               (gstockId IS NOT NULL)
6. RecipeCategory         (gstockId IS NOT NULL)
7. RecipeFamily           (gstockId IS NOT NULL)
8. Supplier               (gstockId IS NOT NULL)
9. MeasureUnit            (gstockId IS NOT NULL)
```

El orden respeta las restricciones de foreign key para evitar errores de integridad. Tras el reset se puede volver a sincronizar desde cero.

---

## 📊 Output del Script CLI

```
═══════════════════════════════════════════════════
  GStock → Sherlock Sync
  Dreamland App · 23/2/2026, 14:30:00
═══════════════════════════════════════════════════

⏳ Fase 1/8: Unidades de medida (v1/product/purchases/units/measure)...
   ✓ 5 registros — 5 creadas, 0 actualizadas, 0 errores · 340ms

⏳ Fase 2/8: Categorías de productos (v1/product/purchases/categories)...
   ✓ 8 registros — 8 creadas, 0 actualizadas · 280ms

⏳ Fase 6/8: Ingredientes (v1/product/purchases)...
   ✓ 250 registros — 250 creados, 0 actualizados · 4.2s

⏳ Fase 7/8: Recetas (v2/recipes)...
   ✓ 45 recetas — 45 creadas, 0 actualizadas · 1.8s

⏳ Fase 8/8: Knowledge Base (RAG)...
   ✓ 94 KB entries generadas · 8.5s

═══════════════════════════════════════════════════
  RESUMEN
═══════════════════════════════════════════════════
  Unidades:     5 synced
  Categorías:   8 synced
  Ingredientes: 250 synced
  Recetas:      45 synced
  KB entries:   94 (source: gstock-recipes)
  Tiempo total: 16.3s
═══════════════════════════════════════════════════
```

---

## 🔗 Referencias

- [Análisis de GStock API](../analysis/gstock.md)
- [Schema Prisma — Sherlock](../schema/prisma-schema.md)
- [RAG Pipeline — ATC](../../atc/rag-pipeline.md)
- [Knowledge Base — ATC](../../atc/knowledge-base.md)
