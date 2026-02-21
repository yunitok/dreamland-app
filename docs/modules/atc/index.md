---
title: ATC — Atención al Cliente
description: Módulo de gestión de atención al cliente con IA y base de conocimiento RAG
---

# 🎧 Módulo ATC — Atención al Cliente

## Resumen Ejecutivo

El módulo ATC es el **sistema de atención al cliente inteligente** de Dreamland App. Equipa al personal de sala con un asistente conversacional que consulta en tiempo real una base de conocimiento vectorial, gestiona reservas, incidencias y listas de espera — todo desde una sola interfaz.

El módulo combina:
- **Base de conocimiento RAG** — Información del restaurante indexada como vectores semánticos en Pinecone
- **Asistente IA con herramientas** — Chat que llama a tools para buscar KB, reservas, incidencias y esperas
- **Importador de archivos** — Pipeline de normalización IA para ingerir Excel, PDF y CSV
- **Gestión operativa** — Reservas, incidencias, lista de espera, alertas meteorológicas, facturas y más

---

## 🎯 Problemas que Resuelve

| Sin ATC | Con ATC |
|---------|---------|
| El personal busca manualmente en documentos dispersos | Consulta conversacional en segundos |
| Respuestas inconsistentes entre agentes | Una única fuente de verdad verificada |
| Reimportación de información duplicada | Deduplicación automática por SHA-256 |
| Información solo en Excel/Drive | Cualquier formato (Excel, PDF, CSV) normalizado con IA |
| Sin trazabilidad de consultas | Cada conversación queda registrada en `Query` + `QueryResolution` |

---

## 🏗️ Arquitectura de Alto Nivel

```mermaid
graph TB
    subgraph "Importación de Conocimiento"
        A[Archivo Excel/PDF/CSV] --> B[/parse-file API]
        C[Texto manual] --> D[/normalize API]
        B --> D
        D --> E[Staged Entries Review]
        E --> F[publishStagedEntries]
        F --> G[(PostgreSQL\nKnowledgeBase)]
        F --> H[(Pinecone\nVectors)]
    end

    subgraph "Chat ATC"
        I[Agente de sala] --> J[Chat UI]
        J --> K[/api/atc/chat]
        K --> L{Herramientas}
        L --> M[searchKnowledgeBase]
        L --> N[lookupReservation]
        L --> O[getActiveIncidents]
        L --> P[checkWaitingList]
        M --> H
        M --> G
        N --> G
        O --> G
        P --> G
        K --> Q[(Query\nTrazabilidad)]
    end
```

---

## 📦 Modelos de Datos

El módulo define **16 modelos Prisma** agrupados por dominio:

### Conocimiento y Consultas
| Modelo | Descripción |
|--------|-------------|
| `KnowledgeBase` | Entradas de conocimiento con embedding vectorial, deduplicación por hash |
| `QueryCategory` | Categorías de consultas (11 predefinidas: SPACES, MENUS, ALLERGENS…) |
| `Query` | Registro de consultas con canal, estado y score de confianza |
| `QueryResolution` | Respuestas a consultas (manual o `AI`) |

### Reservas y Clientes
| Modelo | Descripción |
|--------|-------------|
| `Reservation` | Reservas con integración futura CoverManager (`externalId`, `externalSource`) |
| `ReservationChannel` | Canales de reserva (web, teléfono, walk-in…) |
| `WaitingList` | Lista de espera por fecha con prioridad |
| `ReservationModification` | Historial de modificaciones |
| `GroupReservation` | Reservas de grupos con coordinating notes |

### Operaciones
| Modelo | Descripción |
|--------|-------------|
| `Incident` | Incidencias operativas con severidad y estado |
| `WeatherAlert` | Alertas meteorológicas activas |
| `PaymentRecovery` | Seguimiento de cobros pendientes |
| `EmailInbox` | Bandeja de emails de clientes |

### Facturación y Vouchers
| Modelo | Descripción |
|--------|-------------|
| `Invoice` | Facturas con estado de emisión |
| `GiftVoucher` | Tarjetas regalo con código y saldo |
| `VoucherTransaction` | Transacciones de uso de vouchers |

---

## 🔐 Roles y Permisos

El módulo define dos roles específicos:

```typescript
// src/lib/permissions.ts
ATC_VIEWER: [{ resource: "atc", action: "read" }]
ATC_AGENT:  [{ resource: "atc", action: "read" }, { resource: "atc", action: "manage" }]
```

| Operación | ATC_VIEWER | ATC_AGENT | SUPER_ADMIN |
|-----------|-----------|-----------|-------------|
| Ver KB, reservas, incidencias | ✅ | ✅ | ✅ |
| Chat con asistente IA | ✅ | ✅ | ✅ |
| Crear/editar/eliminar KB | ❌ | ✅ | ✅ |
| Importar archivos | ❌ | ✅ | ✅ |
| Toggle activo/inactivo KB | ❌ | ✅ | ✅ |
| Borrado masivo por source | ❌ | ✅ | ✅ |

> Los server actions llaman `requirePermission("atc", "manage")` o `requirePermission("atc", "read")` como primera instrucción.

---

## 📁 Estructura de Archivos

```
src/
├── app/
│   ├── api/atc/
│   │   ├── chat/
│   │   │   ├── route.ts          ← Streaming chat con herramientas IA
│   │   │   └── tools.ts          ← 4 herramientas: KB, reservas, incidencias, espera
│   │   └── knowledge-base/
│   │       ├── parse-file/       ← Parser unificado (Excel, PDF, CSV)
│   │       ├── normalize/        ← Normalización con GPT-4o-mini via OpenRouter
│   │       └── sync-gstock/      ← Webhook n8n para sincronización GStock
│   └── [locale]/(modules)/atc/
│       ├── layout.tsx            ← requirePermission("atc", "read")
│       ├── page.tsx              ← Chat principal
│       └── knowledge-base/
│           └── page.tsx          ← Tabla de gestión de KB
│
├── modules/atc/
│   ├── actions/
│   │   └── knowledge-base.ts     ← Server actions CRUD + bulk import
│   ├── domain/
│   │   └── schemas.ts            ← Zod schemas
│   └── ui/
│       └── knowledge-base/
│           ├── kb-import-panel.tsx      ← Dialog de importación (Texto/Archivo)
│           ├── knowledge-base-table.tsx ← DataTable con toggle, edición y borrado
│           └── knowledge-base-dialog.tsx← Dialog de creación/edición manual
│
└── lib/
    ├── embeddings.ts    ← text-embedding-3-small + HyDE via OpenRouter
    └── pinecone.ts      ← Cliente Pinecone v7 (upsert, search, delete)
```

---

## 🏷️ Sources de Knowledge Base

Las entradas tienen un campo `source` que identifica su origen:

| Source | Badge | Descripción |
|--------|-------|-------------|
| `manual` | Azul | Creado manualmente desde el dialog |
| `staged` | Morado | Importado desde la pestaña "Texto" |
| `file` | Teal | Importado desde archivo (Excel/PDF/CSV) |
| `excel` | Esmeralda | Legacy — importaciones antiguas de Excel |
| `gstock` | Verde | Sincronizado automáticamente desde GStock via n8n |
| `n8n` | Naranja | Importado manualmente via webhook n8n |

---

## 📚 Documentación del Módulo

- **[Knowledge Base](./knowledge-base)** — Gestión de conocimiento, importación de archivos, deduplicación
- **[RAG Pipeline](./rag-pipeline)** — Embeddings, Pinecone, HyDE, chat con herramientas, trazabilidad
- **[Clasificación de Email](./email-classification)** — Sistema de clasificación automática de emails con IA
- **[Gestión de Incidencias](./operations-incidents)** — Registro, seguimiento y resolución de incidencias operativas
- **[Parte Meteorológico](./operations-weather)** — Previsión AEMET/OWM, alertas automáticas, umbrales configurables, dashboard visual

---

## 🚦 Estado Actual

### ✅ Implementado
- [x] Schema completo (17 modelos, 4 migraciones)
- [x] Chat ATC con streaming (Vercel AI SDK v6)
- [x] 4 herramientas: searchKnowledgeBase (HyDE), lookupReservation, getActiveIncidents, checkWaitingList
- [x] Knowledge Base CRUD con embeddings
- [x] Importador de archivos: Excel, PDF, CSV
- [x] Deduplicación por contentHash (SHA-256)
- [x] Normalización IA (GPT-4o-mini) con chunking automático
- [x] Toggle activo/inactivo con sync a Pinecone
- [x] Borrado masivo por source (DB + Pinecone)
- [x] Trazabilidad de consultas (Query + QueryResolution)
- [x] Webhook n8n para sync GStock
- [x] Gestión de incidencias operativas (crear, resolver)
- [x] Alertas meteorológicas con consulta AEMET/OWM
- [x] Dashboard visual de alertas (KPIs, gráficos, tarjetas por ciudad)
- [x] Umbrales meteorológicos configurables desde UI
- [x] Filtro de temperaturas por franja horaria de servicio
- [x] Clasificación automática de emails con IA
- [x] 9 ubicaciones de restaurante con coordenadas y municipio AEMET

### 📋 Planificado
- [ ] Gestión de reservas desde UI (CRUD completo)
- [ ] Integración CoverManager (campo `externalId` preparado)
- [ ] Dashboard de métricas ATC
- [ ] Cron automático de consulta meteorológica
- [ ] Expiración automática de alertas pasadas
- [ ] Reactivar alertas en monitoreo desde la UI

---

**Última actualización**: 2026-02-21
