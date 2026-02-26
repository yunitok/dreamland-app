---
title: Clasificación Automática de Emails
description: Pipeline Gmail → n8n → LLM → Dreamland App para clasificar emails entrantes del ATC
---

# Clasificación Automática de Emails

## Estado actual

**Código desplegado** — todo el backend y la UI están en producción.
**Workflow v2 (Batch)** — optimizado para procesar 50+ emails por ejecución.

## Arquitectura del flujo (v2 Batch)

```
Gmail (Workspace: contacto@volteretarestaurante.com)
    ↓ polling cada 5 min (is:unread, limit 50)
n8n Workflow v2 (17 nodos)
    ├── Set Config: URL de la app (centralizado)
    ├── Extraer: from, subject, body (max 3000 chars)
    ├── Batch Check dedup: POST /api/atc/email/check-exists-batch (1 llamada)
    ├── Filtrar nuevos → Dividir en lotes de 5
    ├── Clasificar batch: OpenRouter gpt-4o-mini → JSON array por lote
    ├── Parsear + fusionar clasificaciones
    └── Batch Ingestar: POST /api/atc/email/ingest (1 llamada, array)
         ↓
Dreamland App
    ├── Dedup por messageId (@unique)
    ├── Resolver categoryId desde slug
    ├── INSERT en email_inbox
    └── Notificaciones automáticas si priority >= 4
         ↓
UI Backoffice (/atc/backoffice)
    ├── Filtros: categoría, prioridad, búsqueda, leídos/no leídos
    ├── Detalle email con metadatos IA
    └── Gestión CRUD de categorías (/atc/backoffice/categories)
```

### Reducción de llamadas HTTP (v1 → v2)

| Escenario | v1 (3 calls/email) | v2 Batch |
|---|---|---|
| 10 emails, 5 nuevos | 20 llamadas | 3 llamadas |
| 50 emails, 30 nuevos | N/A (límite 10) | 8 llamadas |
| 50 emails, 0 nuevos | N/A | 1 llamada |

## Archivos clave en el código

| Archivo | Función |
|---------|---------|
| `prisma/schema.prisma` | Modelos `EmailCategory` y `EmailInbox` |
| `src/app/api/atc/email/ingest/route.ts` | Webhook de ingesta (n8n → app) |
| `src/app/api/atc/email/check-exists/route.ts` | Endpoint de deduplicación (single) |
| `src/app/api/atc/email/check-exists-batch/route.ts` | Endpoint de deduplicación batch (array) |
| `src/modules/atc/actions/backoffice.ts` | Server actions (CRUD categorías, filtros inbox) |
| `src/modules/atc/ui/backoffice/email-inbox-tab.tsx` | UI de bandeja con filtros |
| `src/modules/atc/ui/backoffice/email-detail-dialog.tsx` | Dialog detalle email |
| `src/modules/atc/ui/backoffice/email-category-manager.tsx` | CRUD categorías |
| `src/app/[locale]/(modules)/atc/backoffice/categories/page.tsx` | Página categorías |

---

## Configuración de Google Workspace (paso a paso)

### Paso 1 — Google Cloud Console

1. Ir a [console.cloud.google.com](https://console.cloud.google.com) → proyecto "My First Project"
2. **APIs & Services → Library** → buscar "Gmail API" → **Enable** (ya hecho)
3. **APIs & Services → Credentials → Create Credentials → Service Account**
   - Nombre: `n8n-atc-email` (ya creado)
   - Email: `n8n-atc-email@unified-surfer-488016-f7.iam.gserviceaccount.com`
4. Dentro del Service Account → **Keys** → JSON key activa (ya descargada)

### Paso 2 — Domain-Wide Delegation (Google Admin Console)

1. Del JSON descargado, usar el campo `client_id`: `117366199385343619182`
2. Ir a [admin.google.com](https://admin.google.com)
3. **Seguridad → Controles de APIs → Delegación de todo el dominio**
4. **Añadir nuevo**:
   - **Client ID**: `117366199385343619182`
   - **Ámbitos OAuth** (copiar exacto, sin espacios):
     ```
     https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify,https://mail.google.com/
     ```
5. **Autorizar**
6. Esperar propagación (puede tardar de minutos a 24h)

### Paso 3 — Credencial en n8n

1. **Credentials → Add → Google Service Account API**
2. **Connect using**: Service Account
3. **Region**: Europe (Paris)
4. **Service Account Email**: `n8n-atc-email@unified-surfer-488016-f7.iam.gserviceaccount.com`
5. **Private Key**: valor del campo `private_key` del JSON (incluir los `\n`)
6. **Impersonate a User**: ON → `contacto@volteretarestaurante.com`
7. **Save** → debe conectar sin error 401

### Paso 4 — Credenciales de autenticación en n8n

> **Nota**: n8n Community Edition self-hosted no dispone de "Variables" en Settings.
> Los secretos se gestionan mediante **credenciales Header Auth** (cifradas) y la URL
> se configura en un nodo "Set Config" dentro del propio workflow.

#### 4a. Credencial "Dreamland Webhook Auth"

1. **Credentials → Add → Header Auth**
2. **Name**: `x-n8n-secret`
3. **Value**: mismo valor que `N8N_WEBHOOK_SECRET` en `.env` de la app
4. **Save**

#### 4b. Credencial "OpenRouter API Key"

1. **Credentials → Add → Header Auth**
2. **Name**: `Authorization`
3. **Value**: `Bearer sk-or-v1-XXXXXXX` (API key completa con prefijo Bearer)
4. **Save**

---

## Importar y configurar el workflow en n8n

### Paso 5 — Importar workflow

1. En n8n → **Workflows → Import from JSON**
2. Usar el archivo `n8n-email-classification-workflow.json` (junto a este documento)
3. Tras importar, configurar manualmente los pasos siguientes

### Paso 6 — Asignar credenciales

| Nodo | Credencial |
|------|-----------|
| `Gmail - Get Unread` | Google Service Account (Paso 3) |
| `Gmail - Mark as Read` | Google Service Account (Paso 3) |
| `Batch Check-Exists` | Dreamland Webhook Auth (Paso 4a) |
| `Classify Batch LLM` | OpenRouter API Key (Paso 4b) |
| `Batch Ingest` | Dreamland Webhook Auth (Paso 4a) |

### Paso 7 — Configurar URL de la app

1. Abrir el nodo **"Set Config"** (primer nodo tras el trigger)
2. Cambiar `https://dreamland-app.vercel.app` por la URL real de producción
3. Guardar

### Paso 8 — Test manual

1. Enviar un email de prueba a `contacto@volteretarestaurante.com`
2. En n8n → **Test Workflow** (botón play)
3. Verificar que el email aparece clasificado en `/atc/backoffice`
4. Si todo OK → activar el workflow (toggle ON) para polling automático cada 5 min

---

## Troubleshooting

### Error 401 `unauthorized_client` al conectar credencial

La Domain-Wide Delegation no ha propagado. Opciones:
1. Esperar 15-30 minutos y reintentar
2. En Admin Console: borrar la entrada de delegación y recrearla con los mismos datos
3. Verificar que el `client_id` en Admin Console coincide exactamente con el del JSON
4. Añadir el scope `https://mail.google.com/` a los ámbitos

### Emails no aparecen en el backoffice

1. Verificar que el workflow se ejecuta en n8n (Executions tab)
2. Verificar que el valor de la credencial "Dreamland Webhook Auth" coincide con `N8N_WEBHOOK_SECRET` en `.env` de la app
3. Verificar que la URL en el nodo "Set Config" es correcta y accesible desde n8n
4. Comprobar logs de Vercel por errores en `/api/atc/email/ingest`

### Email duplicado

Normal — el sistema tiene triple protección:
1. `check-exists-batch` previo (ahorra llamadas al LLM)
2. Dedup interno en el endpoint `ingest` (verifica antes de INSERT)
3. `@unique` en `messageId` a nivel de base de datos

---

## Categorías de clasificación

24 categorías configuradas (12 padres + 12 subcategorías), gestionables desde `/atc/backoffice/categories`.

El LLM clasifica usando estos slugs exactos:

| Slug | Categoría | Prioridad base |
|------|-----------|---------------|
| `reservas_nueva` | Reserva Nueva | 3 |
| `reservas_modificacion` | Modificación | 3 |
| `reservas_cancelacion` | Cancelación | 4 |
| `reservas_confirmacion` | Confirmación | 2 |
| `reclamaciones_servicio` | Queja Servicio | 4 |
| `reclamaciones_comida` | Queja Comida | 4 |
| `reclamaciones_cobro` | Queja Cobro | 4 |
| `consultas_horarios` | Horarios | 2 |
| `consultas_menu` | Menú y Carta | 2 |
| `consultas_servicios` | Servicios | 2 |
| `facturacion_solicitud` | Solicitud Factura | 3 |
| `facturacion_error` | Error Factura | 4 |
| `eventos` | Eventos y Grupos | 3 |
| `alergias` | Alergias/Dietético | 4 |
| `objetos_perdidos` | Objetos Perdidos | 2 |
| `colaboraciones` | Colaboraciones | 1 |
| `empleo` | Empleo | 1 |
| `bonos` | Bonos Regalo | 2 |
| `spam` | Spam | 1 |
| `otro` | Otro | 2 |

### Prioridades

| Nivel | Nombre | Criterio |
|-------|--------|----------|
| 5 | URGENTE | Queja grave, incidente de salud, amenaza legal, VIP |
| 4 | ALTA | Reclamación, error de cobro, cancelación, grupo grande |
| 3 | MEDIA | Reserva nueva, modificación, factura |
| 2 | BAJA | Consulta general, horarios, información |
| 1 | MINIMA | Spam, newsletters, empleo, colaboraciones |

---

## Coste estimado

- gpt-4o-mini vía OpenRouter: ~$0.000135/email (menos en batch por compartir system prompt)
- 100 emails/día → ~$0.35/mes (optimizado con clasificación batch de 5 emails/llamada)

---

## Fases futuras

| Fase | Funcionalidad |
|------|--------------|
| 2 | Auto-crear Incidencias si `reclamaciones_*` y priority >= 4 |
| 3 | Auto-asignación de emails a agentes por categoría |
| 4 | Auto-respuesta con templates por categoría |
| 5 | Notificaciones Slack para priority >= 4 |
| 6 | Dashboard analytics de volumen y tiempos |

---

## JSON del workflow n8n

El archivo JSON importable está en:

📄 **[`n8n-email-classification-workflow.json`](./n8n-email-classification-workflow.json)**

Para importar: en n8n → **Workflows → Import from JSON** → pegar el contenido del archivo.

### Flujo del workflow v2 (17 nodos)

```
Every 5 Min → Set Config → Gmail Get 50 Unread → Extract Email Data
  → Collect MessageIds → Batch Check-Exists (1 llamada)
  → Filter New Emails → Has New Emails?
  ├─ true  → Prepare Batches (lotes de 5)
  │          → Build LLM Prompt → Classify Batch LLM → Parse & Merge
  │          → Collect All → Batch Ingest (1 llamada) → Prepare Mark Read → Gmail Mark Read
  └─ false → All Duplicates (NoOp)
```

### Configuración centralizada

- **URL de la app**: se define en el nodo "Set Config" (editable directamente)
- **Webhook secret**: credencial Header Auth "Dreamland Webhook Auth" (cifrada)
- **API key LLM**: credencial Header Auth "OpenRouter API Key" (cifrada)
- **Gmail**: credencial Google Service Account (cifrada)

### Mejoras respecto a v1

- **50 emails/ejecución** (antes 10)
- **Clasificación batch**: 5 emails por llamada LLM (antes 1)
- **Dedup batch**: 1 llamada HTTP para N emails (antes N llamadas)
- **Ingest batch**: 1 llamada HTTP con array (antes N llamadas)
- **Sin bug de item pairing**: datos fluyen explícitamente por Code nodes, sin depender de referencias cruzadas de n8n
