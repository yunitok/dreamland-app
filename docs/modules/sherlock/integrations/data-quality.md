---
title: Auditoría de Calidad de Datos
description: Herramientas de auditoría, healthcheck y análisis de alérgenos para los datos de GStock
---

# Auditoría de Calidad de Datos

## Resumen

Sherlock incluye herramientas de auditoría para verificar la calidad e integridad de los datos importados desde GStock. Estas herramientas son accesibles desde la UI de **Sherlock > Settings** y via scripts CLI.

Las herramientas cubren tres áreas principales:
- **Auditoría de calidad**: análisis exhaustivo de los datos por endpoint
- **Healthcheck de API**: verificación de conectividad y estado de los endpoints
- **Informe de alérgenos**: detección de alérgenos declarados e inferidos en recetas

---

## Auditoría de Calidad (`runFullAuditCore()`)

| | |
|---|---|
| **Archivo** | `src/modules/sherlock/domain/data-quality/audit-core.ts` |
| **Tipo** | Función asíncrona server-side |
| **Output** | `FullAuditReport` |

Audita **12 endpoints de GStock en paralelo** (batches de 4), analizando campo por campo los datos devueltos para detectar problemas de calidad.

### Problemas detectados

- Duplicados potenciales (nombres similares tras normalización)
- Inconsistencias de case (mayúsculas/minúsculas)
- Whitespace sobrante (leading/trailing)
- Espacios dobles dentro de cadenas
- Diacríticos inconsistentes (p. ej. `café` vs `cafe`)
- Campos vacíos o nulos donde se espera un valor

### Estructura del reporte

```typescript
interface FullAuditReport {
  globalScore: number           // 0-100, media ponderada
  endpointsAudited: number      // 12
  totalIssues: number
  endpoints: EndpointAuditResult[]
}

interface EndpointAuditResult {
  endpoint: string
  healthScore: number           // 0-100 por endpoint
  totalRecords: number
  issues: FieldIssue[]
}
```

Cada endpoint recibe un `healthScore` de 0 a 100 calculado en función del número y severidad de los issues encontrados.

### Archivos de soporte

| Archivo | Responsabilidad |
|---------|----------------|
| `audit-core.ts` | Orquestador principal de la auditoría |
| `analyzers.ts` | Funciones de análisis por campo (duplicados, case, whitespace, etc.) |
| `report-builder.ts` | Cálculo de scores y construcción del reporte final |
| `endpoint-config.ts` | Configuración de los 12 endpoints a auditar |

Todos los archivos de soporte se encuentran en `src/modules/sherlock/domain/data-quality/`.

---

## Healthcheck de API (`runGstockHealthcheck()`)

| | |
|---|---|
| **Archivo** | `src/modules/sherlock/domain/gstock-audit/healthcheck.ts` |
| **Tipo** | Función asíncrona server-side |
| **Output** | `HealthcheckReport` |

Verifica la conectividad de todos los endpoints GET de GStock que no requieren parámetros obligatorios (`requiredParams`).

### Comportamiento

- Prueba los endpoints **en paralelo** (batches de 5)
- **Timeout** de 15 segundos por endpoint
- Clasifica los errores en tres categorías:
  - `TIMEOUT` — el endpoint no responde en 15s
  - `AUTH_FAILED` — respuesta 401/403
  - `ERROR` — cualquier otro código de error HTTP

### Estructura del reporte

```typescript
interface HealthcheckReport {
  ok: EndpointStatus[]          // Endpoints que responden correctamente
  failed: EndpointStatus[]      // Endpoints con error
  avgResponseTimeMs: number     // Tiempo medio de respuesta de los OK
}

interface EndpointStatus {
  endpoint: string
  status: "OK" | "TIMEOUT" | "AUTH_FAILED" | "ERROR"
  responseTimeMs?: number
  statusCode?: number
  error?: string
}
```

---

## Informe de Alérgenos (`generateAllergenReport()`)

| | |
|---|---|
| **Archivo** | `src/modules/sherlock/domain/gstock-sync/allergen-report.ts` |
| **Tipo** | Función asíncrona server-side |
| **Output** | `AllergenReport` |

Genera un informe completo de todas las recetas con alérgenos, combinando los **declarados por GStock** con los **inferidos por keywords**.

### Inferencia de alérgenos

El archivo `allergen-keywords.ts` mapea los **14 AllergenTypes** de declaración obligatoria a keywords en español:

```typescript
// allergen-keywords.ts (extracto)
GLUTEN:    ["trigo", "harina", "pan", "centeno", "cebada", "pasta", ...]
LACTEOS:   ["leche", "nata", "queso", "mantequilla", "yogur", ...]
HUEVOS:    ["huevo", "tortilla", "mayonesa", ...]
PESCADO:   ["salmón", "bacalao", "merluza", "atún", "anchoa", ...]
CRUSTACEOS: ["gamba", "langostino", "cangrejo", "bogavante", ...]
MOLUSCOS:  ["calamar", "pulpo", "mejillón", "almeja", ...]
// ... 14 alérgenos totales
```

Los alérgenos declarados por GStock tienen **prioridad**; los inferidos se añaden como complemento.

### Estructura del reporte

```typescript
interface AllergenReport {
  totalRecipes: number
  recipesWithAllergens: number
  allergenSummary: Record<AllergenType, number>  // Conteo por tipo
  recipes: RecipeAllergenDetail[]                 // Detalle por receta
}

interface RecipeAllergenDetail {
  recipeName: string
  declaredAllergens: AllergenType[]   // Desde GStock
  inferredAllergens: AllergenType[]   // Por keywords
  allAllergens: AllergenType[]        // Merged
  ingredients: string[]
}
```

---

## Scripts CLI

### `scripts/gstock-endpoint-healthcheck.ts`

Healthcheck exhaustivo que prueba **54 endpoints GET + 2 POST** de la API de GStock, agrupados por categoría.

```bash
npx tsx scripts/gstock-endpoint-healthcheck.ts
```

A diferencia del healthcheck de la UI, este script cubre **todos** los endpoints documentados, incluyendo los que requieren parámetros.

### `scripts/gstock-full-audit.ts`

Validación contra la especificación OpenAPI de GStock, cubriendo aproximadamente **130 endpoints**.

```bash
npx tsx scripts/gstock-full-audit.ts
```

Genera un informe detallado con:
- Endpoints que responden correctamente
- Endpoints con errores
- Campos faltantes o con tipos inesperados vs. la spec
- Resumen global de cobertura

---

## Acceso y Permisos

Estas herramientas se ejecutan de dos formas:

| Método | Permiso requerido | Notas |
|--------|-------------------|-------|
| UI (Sherlock > Settings) | `sherlock:manage` | Server actions con RBAC |
| Scripts CLI | Acceso directo al servidor | Variables de entorno requeridas |

Las herramientas de auditoría **no** están expuestas en la pantalla de procesos admin (`/admin/processes`). Son exclusivas de la sección de Sherlock.

---

## Referencias

- [Pipeline de Sincronización GStock](./gstock-sync-pipeline.md)
- [Integración GStock](./gstock.md)
- [RAG Pipeline — ATC](../../atc/rag-pipeline.md)
