---
title: Deployment Guide
description: Production deployment instructions for Vercel, Railway, and other platforms
---

# Deployment Guide - Dreamland Manager

## Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase)
- Supabase project con Storage habilitado
- API keys para AI providers (OpenRouter, Groq, Gemini)

---

## Environment Variables

Crear el archivo `.env` en producción con las siguientes variables:

```bash
# Base de datos Supabase (Transaction Pooler — recomendado para runtime)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# Supabase Storage
# Obtener en: Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # ⚠️ NUNCA exponer al cliente

# AI Provider
AI_PROVIDER="openrouter"             # "openrouter" | "gemini" | "groq"
OPENROUTER_API_KEY="sk-or-v1-..."
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."
GROQ_API_KEY="gsk_..."
AI_CHAT_MODEL="google/gemini-3-flash-preview"
AI_REPORT_MODEL="openai/gpt-4o-mini"
AI_COMMAND_MODEL="openai/gpt-4o-mini"

# Seguridad
JWT_SECRET="genera-un-secret-aleatorio-de-32+-caracteres"
APP_URL="https://tu-dominio.com"

# Pinecone (RAG — módulo ATC)
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX_NAME="dreamland-atc"

# Integraciones opcionales
YUREST_API_URL="https://..."
YUREST_TOKEN="..."
GSTOCK_API_URL="https://..."
GSTOCK_CLIENT_ID="..."
GSTOCK_CLIENT_SECRET="..."
AEMET_API_KEY="..."
N8N_WEBHOOK_SECRET="..."
```

---

## Deployment Steps

### 1. Install Dependencies

```bash
npm install --production
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run Migrations

```bash
npx prisma migrate deploy
```

### 4. Setup Supabase Storage Buckets

Ejecutar en Supabase Dashboard → SQL Editor:

```sql
-- Copiar y ejecutar el contenido de: scripts/setup-supabase-storage.sql
-- Crea los buckets 'avatars' (público) y 'attachments' (privado)
```

Este paso es necesario para que funcionen la subida de avatares y adjuntos de tareas.

### 5. Run Seed (First Deploy Only)

```bash
npx tsx prisma/seed.ts
```

### 6. Build Application

```bash
npm run build
```

### 7. Start Production Server

```bash
npm start
```

---

## Platform-Specific Guides

### Vercel (Recommended)

1. Conectar repositorio GitHub
2. Configurar todas las variables de entorno en el Dashboard de Vercel
3. Build command: `npm run build`
4. Output directory: `.next`
5. Deploy automático en cada push a `main`

> **Nota**: Al usar Vercel, el filesystem local NO persiste entre deploys. Supabase Storage es obligatorio para que los adjuntos y avatares funcionen correctamente.

### Railway

1. Crear nuevo proyecto desde GitHub
2. Añadir servicio PostgreSQL (o usar Supabase externo)
3. Configurar variables de entorno
4. Deploy

---

## Post-Deployment

### Verificar Supabase Storage

Comprobar en Supabase Dashboard → Storage → Buckets:
- `avatars` (public) ✅
- `attachments` (private) ✅

### Cambiar Contraseña del Admin

```sql
UPDATE "User" SET password = '...' WHERE username = 'admin';
```

O usar el formulario de cambio de contraseña de la aplicación.

### Monitor AI Usage

Revisar cuotas regularmente para evitar interrupciones del servicio.

---

## Further Reading

- [Authentication](../capabilities/authentication.md) — Sistema de sesiones JWT y middleware de rutas
- [File Storage](../capabilities/file-storage.md) — Supabase Storage, buckets y URLs firmadas
- [System Overview](../architecture/system-overview.md) — Arquitectura general
