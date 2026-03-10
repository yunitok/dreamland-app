---
title: Quick Start Guide
description: Guía rápida para comenzar con GastroLab
---

# 📖 GastroLab Module - README

**Gestión Integral de Restaurantes con IA**

---

## 🎯 Resumen Ejecutivo

GastroLab es el módulo de gestión de restaurantes para Dreamland App que combina lo mejor de **Yurest** y **Gstock**, añadiendo capacidades únicas de IA para:

- ✅ **Normalización semántica** de ingredientes duplicados
- ✅ **Auditoría por voz** en cocina sin interrupciones
- ✅ **Protocolo de sala** integrado en cada receta
- ✅ **Chef GPT** para generación de recetas
- ✅ **Triple sistema de detección de desperdicios**

---

## 📚 Documentación Completa

### 📊 Investigación y Análisis
- **[Análisis Yurest](./analysis/yurest.md)** - API, trazabilidad, multimedia
- **[Análisis Gstock](./analysis/gstock.md)** - OAuth2, unidades, costes
- **[Comparativa](./analysis/comparison.md)** - Tabla de campos y recomendaciones

### 🏗️ Diseño de Esquema
- **[Prisma Schema](./schema/prisma-schema.md)** - 18 modelos completos
- **[Decisiones de Diseño](./schema/design-decisions.md)** - 13 decisiones arquitectónicas
- **[Diagramas ER](./schema/entity-relationships.md)** - Visualizaciones Mermaid

### 🔌 Guías de Integración
- **[Yurest Integration](./integrations/yurest.md)** - Token API, polling, mapeo
- **[Gstock Integration](./integrations/gstock.md)** - OAuth2, webhooks, bidireccional

### 🗓️ Roadmap
- **[Fases de Implementación](./roadmap/implementation-phases.md)** - 7 fases detalladas

---

## 🚀 Quick Start

### 1. Revisar Análisis
```bash
# Leer análisis de plataformas existentes
cat docs/modules/gastrolab/analysis/yurest.md
cat docs/modules/gastrolab/analysis/gstock.md
cat docs/modules/gastrolab/analysis/comparison.md
```

### 2. Estudiar Esquema
```bash
# Ver modelos de base de datos
cat docs/modules/gastrolab/schema/prisma-schema.md

# Entender decisiones
cat docs/modules/gastrolab/schema/design-decisions.md
```

### 3. Preparar Integraciones
```bash
# Configurar variables de entorno
cp .env.example .env

# Añadir credenciales
# YUREST_TOKEN=...
# GSTOCK_CLIENT_ID=...
# GSTOCK_CLIENT_SECRET=...
```

### 4. Aplicar Migraciones
```bash
# Generar migración inicial
npx prisma migrate dev --name initial_gastrolab_schema

# Seed con datos básicos
npx prisma db seed
```

---

## 📁 Estructura de Archivos

```
docs/modules/gastrolab/
├── index.md                          # Este archivo (overview)
├── analysis/
│   ├── yurest.md                     # Análisis completo Yurest API
│   ├── gstock.md                     # Análisis completo Gstock API
│   └── comparison.md                 # Tabla comparativa
├── schema/
│   ├── prisma-schema.md              # Schema Prisma completo
│   ├── design-decisions.md           # 13 decisiones arquitectónicas
│   └── entity-relationships.md       # Diagramas ER y flujos
├── integrations/
│   ├── yurest.md                     # Guía integración Yurest
│   └── gstock.md                     # Guía integración Gstock
└── roadmap/
    └── implementation-phases.md      # 7 fases de desarrollo
```

---

## 🔑 Características Únicas

### 1. Normalización Semántica
**Problema**: "Tomate", "Tomate Frito", "Salsa Tomate" duplicados  
**Solución**: LLM agrupa automáticamente con `aiNormalizedGroup`

### 2. Auditoría por Voz
**Problema**: Verificar recetas sin interrumpir cocina  
**Solución**: Whisper + LLM compara audio vs receta

### 3. Protocolo de Sala
**Campo especial**: Emplatado, alergias, maridaje por receta

### 4. Chef GPT
**Generación IA**: Recetas completas con costes estimados

---

## ✅ Estado Actual

| Fase | Estado | Fecha |
|------|--------|-------|
| **Fase 1**: Investigación | ✅ Completado | 2026-02-15 |
| **Fase 2**: Diseño Esquema | ✅ Completado | 2026-02-15 |
| **Fase 3**: Infraestructura | 🔄 En progreso | - |
| **Fase 4**: Workflows | 📋 Planificado | - |
| **Fase 5**: UI MVP | 📋 Planificado | - |
| **Fase 6**: IA Features | 📋 Planificado | - |
| **Fase 7**: Avanzadas | 📋 Planificado | - |

---

## 👥 Contribución

Este módulo está en desarrollo activo. Para contribuir:

1. Leer documentación completa en `docs/modules/gastrolab/`
2. Revisar [Design Decisions](./schema/design-decisions.md) para entender arquitectura
3. Seguir convenciones:
   - IDs: `cuid()`
   - Timestamps: `createdAt`, `updatedAt`
   - Indices en foreign keys y búsquedas frecuentes

---

## 📊 Métricas del Módulo

- **18 modelos** Prisma
- **6 enums**
- **25+ índices**
- **9 campos únicos** de GastroLab
- **3 plataformas** integradas (Yurest, Gstock, Chef GPT)

---

## 🔗 Enlaces Rápidos

- [Prisma Schema](./schema/prisma-schema.md)
- [Implementation Roadmap](./roadmap/implementation-phases.md)
- [Yurest API Reference](./analysis/yurest.md#api-endpoints)
- [Gstock API Reference](./analysis/gstock.md#api-endpoints)

---

**Owner**: Miguel  
**Última actualización**: 2026-02-15  
**Versión**: 0.2.0 (Post-Diseño)
