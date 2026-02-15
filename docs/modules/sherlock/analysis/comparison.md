# 🔍 Análisis Comparativo: Yurest vs Gstock vs Sherlock

## Tabla Comparativa de Entidades y Campos

### 1. Gestión de Productos/Ingredientes

| Campo | Yurest | Gstock | Sherlock (Propuesto) | Notas de Integración |
|-------|--------|--------|---------------------|----------------------|
| **ID único** | ✅ `productId` | ✅ `id` + `reference` | ✅ `id` (UUID) | Mapear ambos sistemas |
| **Nombre** | ✅ `name` | ✅ `name` | ✅ `name` | ✅ Campo común |
| **Categoría** | ✅ Sí | ✅ `categoryId` + `subtypeId` | ✅ `category` + jerarquía | Gstock más granular |
| **Unidad de medida** | ✅ Kg, L, Unidad | ✅ `measureUnitId` (tabla) | ✅ `unitType` + conversión | **Normalizar sistema de unidades** |
| **Precio coste** | ✅ `cost` | ✅ `costPrice` | ✅ `cost` | ✅ Campo común |
| **IVA** | ✅ `taxRate` | ✅ `taxRate` | ✅ `taxRate` | ✅ Campo común |
| **Stock actual** | ✅ Tiempo real | ✅ `currentStock` | ✅ `currentStock` | Sincronizar desde ambas |
| **Proveedor** | ⚠️ No documentado | ✅ `supplierId` | ✅ `supplierId` | Adoptar de Gstock |
| **Rendimiento (yield)** | ✅ Para mermas | ❌ No mencionado | ✅ `yield` (0-1) | Adoptar de Yurest |
| **Temperatura conservación** | ✅ `conservationTemp` | ❌ | ✅ `storageTemp` | Adoptar de Yurest |
| **Vida útil** | ✅ `shelfLife` | ❌ | ✅ `shelfLife` (días) | Adoptar de Yurest |
| **Es comprable/vendible** | ✅ Sí | ✅ `isBuyable`/`isSellable` | ✅ Ambos flags | ✅ Campo común |

---

### 2. Gestión de Recetas

| Campo | Yurest | Gstock | Sherlock (Propuesto) | Notas de Integración |
|-------|--------|--------|---------------------|----------------------|
| **ID único** | ✅ `recipeId` | ✅ `id` | ✅ `id` (UUID) | Mapear ambos |
| **Nombre** | ✅ `name` | ✅ `name` | ✅ `name` | ✅ Campo común |
| **Categoría** | ✅ `category` | ✅ `categoryId` + `familyId` | ✅ `category` | Gstock más granular |
| **Ingredientes** | ✅ Lista con cantidades | ✅ `RecipeIngredient[]` | ✅ Tabla intermedia | ✅ Estructura común |
| **Subrecetas** | ⚠️ No claro | ✅ **Soporte explícito** | ✅ Relaciones recursivas | **Adoptar de Gstock** |
| **Tiempo preparación** | ✅ `prepTime` | ❌ | ✅ `prepTime` (min) | Adoptar de Yurest |
| **Pasos/Instrucciones** | ✅ Detallados | ❌ | ✅ `steps[]` | Adoptar de Yurest |
| **Multimedia** | ✅ Fotos + videos | ❌ | ✅ `photos[]` + `videos[]` | Adoptar de Yurest |
| **Coste calculado** | ✅ Escandallo automático | ✅ `theoreticalCost` | ✅ `theoreticalCost` | ✅ Campo común |
| **Coste real** | ⚠️ No documentado | ✅ `realCost` | ✅ `realCost` | **Adoptar de Gstock** |

---

### 3. Control de Inventario

| Campo | Yurest | Gstock | Sherlock (Propuesto) | Notas de Integración |
|-------|--------|--------|---------------------|----------------------|
| **Stock en tiempo real** | ✅ Sí | ✅ Sí | ✅ Sincronizado | Combinar ambas fuentes |
| **Alertas bajo stock** | ✅ Umbrales automáticos | ✅ `minStock` | ✅ `minStock` | ✅ Campo común |
| **Stock máximo** | ❌ | ✅ `maxStock` | ✅ `maxStock` | Adoptar de Gstock |
| **Análisis predictivo** | ✅ Patrones históricos | ❌ | ✅ IA + histórico | **Valor añadido Sherlock** |
| **Ubicación almacén** | ✅ Etiquetado | ✅ `warehouseId` | ✅ `location` + zona | Reconciliar ambos |
| **Trazabilidad** | ✅ **Avanzada** (lotes, fechas) | ⚠️ Básica | ✅ Completa | Adoptar de Yurest |
| **Fecha caducidad** | ✅ `expiryDate` | ❌ | ✅ `expiryDate` | Adoptar de Yurest |
| **Lote** | ✅ `lotNumber` | ❌ | ✅ `lotNumber` | Adoptar de Yurest |

---

### 4. Control de Mermas/Desperdicios

| Campo | Yurest | Gstock | Sherlock (Propuesto) | Notas de Integración |
|-------|--------|--------|---------------------|----------------------|
| **Registro de mermas** | ✅ Manual | ✅ Variación automática | ✅ Ambos métodos | **Combinar enfoques** |
| **Razones** | ✅ Enum (Caducado, Quemado...) | ⚠️ No detallado | ✅ Enum expandido | Adoptar de Yurest |
| **Detección automática** | ❌ | ✅ Teórico vs Real | ✅ IA + variación | **Adoptar + mejorar** |
| **Integración básculas** | ✅ Wi-Fi | ❌ | ✅ Wi-Fi + IoT | Adoptar de Yurest |
| **Rendimiento/yield** | ✅ Calculado | ❌ | ✅ Por ingrediente | Adoptar de Yurest |

---

## 🔄 Patrones Comunes Identificados

### ✅ Campos Universales (Presentes en ambas plataformas)
1. **Productos**: `id`, `name`, `cost`, `taxRate`
2. **Recetas**: `id`, `name`, `category`, ingredientes con cantidades
3. **Inventario**: Stock en tiempo real, alertas de bajo stock
4. **Costes**: Cálculo automático de escandallos

### 🔀 Enfoques Diferentes

| Aspecto | Yurest | Gstock | Recomendación Sherlock |
|---------|--------|--------|------------------------|
| **Unidades de medida** | Texto simple | Tabla normalizada | **Adoptar tabla de Gstock** (más escalable) |
| **Subrecetas** | No claro | Soporte explícito | **Adoptar modelo de Gstock** |
| **Trazabilidad** | **Muy detallada** | Básica | **Adoptar de Yurest** |
| **Detección mermas** | Manual | **Automática** (variación) | **Combinar ambos** |
| **Multimedia recetas** | **Sí** (fotos/videos) | No | **Adoptar de Yurest** |
| **Coste Real vs Teórico** | No documentado | ✅ **Sí** | **Adoptar de Gstock** |

---

## 🎯 Gaps que Sherlock Debe Llenar

### 1. **Normalización Semántica de Ingredientes** (🚀 INNOVACIÓN)
- **Problema**: "Tomate", "Tomate Frito", "Salsa Tomate" como entidades separadas
- **Solución Sherlock**: IA para fusionar entidades relacionadas
- **Base**: Ni Yurest ni Gstock lo hacen

### 2. **Auditoría por Voz** (🚀 INNOVACIÓN)
- **Problema**: Verificar que la cocina sigue las recetas
- **Solución Sherlock**: Whisper + IA comparadora
- **Base**: Ninguna plataforma lo menciona

### 3. **Generación IA de Recetas** (🚀 INNOVACIÓN)
- **Problema**: Crear recetas nuevas optimizadas por coste
- **Solución Sherlock**: LLM con RAG + contexto de inventario
- **Base**: Yurest permite crear manualmente, Sherlock automatiza con IA

### 4. **Protocolo de Sala** (📋 NUEVO CONCEPTO)
- **Problema**: Instrucciones de servicio por plato (emplatado, alergias, maridaje)
- **Solución Sherlock**: Campo adicional en recetas
- **Base**: Ninguna plataforma lo menciona

### 5. **Análisis Predictivo Avanzado** (🚀 INNOVACIÓN)
- **Base Yurest**: Análisis predictivo básico
- **Mejora Sherlock**: ML para predecir desperdicios, costes futuros, tendencias

---

## 🏗️ Recomendaciones para el Diseño de Sherlock

### Arquitectura de Datos Propuesta

#### ✅ Adoptar de Yurest
1. **Trazabilidad completa**: Lotes, fechas de caducidad, temperatura conservación
2. **Rendimiento (yield)**: Para calcular desperdicios en procesos
3. **Multimedia en recetas**: Fotos y videos
4. **Pasos detallados**: Instrucciones paso a paso
5. **Vida útil**: Días de conservación

#### ✅ Adoptar de Gstock
1. **Sistema de unidades normalizado**: Tabla `MeasureUnit` con conversiones
2. **Soporte para subrecetas**: Recetas jerárquicas
3. **Análisis de variación**: Coste teórico vs real
4. **Stock mínimo/máximo**: Control avanzado de inventario
5. **Categorías granulares**: Categoría + Subtipo + Familia

#### 🚀 Añadir Valor Único de Sherlock
1. **Normalización semántica**: IA para fusionar ingredientes duplicados
2. **Auditoría por voz**: Whisper + comparación IA
3. **Generación IA de recetas**: Chef GPT con RAG
4. **Protocolo de sala**: Instrucciones de servicio
5. **ML predictivo**: Predicción de desperdicios y costes

---

## 📊 Esquema de Base de Datos Propuesto para Sherlock

### Entidades Core (Basadas en análisis)

```prisma
// Modelo Prisma para Sherlock

model MeasureUnit {
  id                String  @id @default(cuid())
  name              String  // "Kilogramo", "Litro"
  abbreviation      String  // "Kg", "L"
  type              UnitType
  conversionFactor  Float?  // Conversión a unidad base
  
  ingredients       Ingredient[]
  recipeIngredients RecipeIngredient[]
}

enum UnitType {
  WEIGHT
  VOLUME
  UNIT
}

model Ingredient {
  id                String    @id @default(cuid())
  name              String
  normalizedName    String?   // IA: nombre canónico
  categoryId        String
  category          Category  @relation(fields: [categoryId], references: [id])
  
  // Campos de Yurest + Gstock
  unitTypeId        String
  unitType          MeasureUnit @relation(fields: [unitTypeId], references: [id])
  cost              Float
  taxRate           Float
  isBuyable         Boolean   @default(true)
  isSellable        Boolean   @default(false)
  
  // Inventario (Gstock)
  currentStock      Float?
  minStock          Float?
  maxStock          Float?
  
  // Trazabilidad (Yurest)
  shelfLife         Int?      // Días
  storageTemp       Float?    // Celsius
  yield             Float?    // 0-1 (rendimiento)
  
  // Proveedor (Gstock)
  supplierId        String?
  supplier          Supplier? @relation(fields: [supplierId], references: [id])
  
  // Sherlock exclusivo
  aiNormalizedGroup String?   // Grupo de ingredientes relacionados
  
  recipeIngredients RecipeIngredient[]
  inventoryRecords  InventoryRecord[]
  wasteRecords      WasteRecord[]
}

model Recipe {
  id                String    @id @default(cuid())
  name              String
  categoryId        String
  category          RecipeCategory @relation(fields: [categoryId], references: [id])
  familyId          String?
  family            RecipeFamily? @relation(fields: [familyId], references: [id])
  
  // Yurest
  prepTime          Int?      // Minutos
  steps             String[]  // Instrucciones paso a paso
  photos            String[]  // URLs
  videos            String[]  // URLs
  
  // Costes (Yurest + Gstock)
  theoreticalCost   Float?    // Calculado
  realCost          Float?    // Del sistema
  
  // Sherlock exclusivo
  protocoloDeSala   String?   @db.Text // ✨ NUEVO
  aiGenerated       Boolean   @default(false)
  aiPrompt          String?   @db.Text
  
  ingredients       RecipeIngredient[]
  subrecipes        RecipeSubrecipe[] @relation("ParentRecipe")
  parentRecipes     RecipeSubrecipe[] @relation("ChildRecipe")
}

model RecipeIngredient {
  id           String     @id @default(cuid())
  recipeId     String
  recipe       Recipe     @relation(fields: [recipeId], references: [id])
  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])
  quantity     Float
  unitId       String
  unit         MeasureUnit @relation(fields: [unitId], references: [id])
  
  @@unique([recipeId, ingredientId])
}

model RecipeSubrecipe {
  id           String  @id @default(cuid())
  parentId     String  // Receta que usa la subreceta
  parent       Recipe  @relation("ParentRecipe", fields: [parentId], references: [id])
  childId      String  // Subreceta usada
  child        Recipe  @relation("ChildRecipe", fields: [childId], references: [id])
  quantity     Float
  unitId       String
  
  @@unique([parentId, childId])
}

model WasteRecord {
  id           String    @id @default(cuid())
  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])
  quantity     Float
  reason       WasteReason
  date         DateTime  @default(now())
  responsibleId String?
  
  // Sherlock exclusivo
  detectedByAI Boolean   @default(false)  // ✨ Detectado por auditoría IA
  audioTranscript String? @db.Text
}

enum WasteReason {
  EXPIRED
  BURNED
  SPOILED
  QUALITY_ISSUE
  OVERPRODUCTION
  OTHER
}

model InventoryRecord {
  id           String     @id @default(cuid())
  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])
  quantity     Float
  location     String?
  expiryDate   DateTime?
  productionDate DateTime?
  lotNumber    String?
  createdAt    DateTime   @default(now())
}

// Sherlock exclusivo: Auditorías por voz
model VoiceAudit {
  id             String   @id @default(cuid())
  recipeId       String
  audioUrl       String
  transcription  String   @db.Text
  discrepancies  Json     // Diferencias detectadas
  score          Float    // 0-100
  createdAt      DateTime @default(now())
}
```

---

## 🔗 Estrategia de Integración Recomendada

### Fase 1: Sincronización Inicial (Pull)
1. **Importar desde Yurest**:
   - Recetas existentes (con multimedia y pasos)
   - Trazabilidad de productos
2. **Importar desde Gstock**:
   - Catálogo de productos con precios
   - Unidades de medida
   - Datos de coste teórico vs real

### Fase 2: Sincronización en Tiempo Real (Webhooks)
1. **Desde Gstock** (OAuth2 + Webhooks):
   - Cambios de precio → Actualizar `Ingredient.cost`
   - Bajo stock → Alertas
   - Nueva compra → Actualizar inventario
2. **Desde Yurest** (Token + Polling si no hay webhooks):
   - Nuevas recetas → Importar
   - Cambios en escandallos → Sincronizar

### Fase 3: Exportación Bidireccional
1. **Sherlock → Yurest**:
   - Recetas generadas por IA
   - Actualizaciones de costes optimizados
2. **Sherlock → Gstock**:
   - Mermas detectadas por IA
   - Reportes de auditoría

---

## 🎯 Decisiones Clave de Diseño

### ✅ Decisión 1: Sistema de Unidades
**Adoptar**: Tabla normalizada de Gstock  
**Razón**: Escalable, permite conversiones, estándar de industria

### ✅ Decisión 2: Subrecetas
**Adoptar**: Modelo jerárquico de Gstock  
**Razón**: Soporta recetas complejas (salsas como ingredientes)

### ✅ Decisión 3: Trazabilidad
**Adoptar**: Sistema completo de Yurest  
**Razón**: Cumplimiento normativo, control de calidad

### ✅ Decisión 4: Detección de Mermas
**Combinar**: Manual (Yurest) + Automática (Gstock) + IA (Sherlock)  
**Razón**: Triple capa de seguridad

### ✅ Decisión 5: Multimedia
**Adoptar**: Soporte de Yurest (fotos/videos)  
**Razón**: Facilita formación y auditoría visual

---

## 📅 Próximos Pasos

1. ✅ **Análisis completado**: Yurest + Gstock + comparativa
2. 📝 **Siguiente**: Diseñar esquema Prisma completo de Sherlock
3. 🔌 **Siguiente**: Definir estrategia de integración con n8n workflows
4. 🧪 **Siguiente**: Crear scripts de prueba de API (Yurest + Gstock)

---

## 📚 Conclusiones

### Fortalezas de cada plataforma:
- **Yurest**: Trazabilidad, multimedia, gestión completa ERP
- **Gstock**: Análisis de costes, integraciones, sistema de unidades

### Valor único de Sherlock:
- **IA generativa** para recetas
- **Auditoría por voz** en cocina
- **Normalización semántica** de ingredientes
- **Protocolo de sala** integrado
- **Análisis predictivo** avanzado

### Mejor enfoque:
**Sherlock como capa IA sobre Yurest + Gstock**, añadiendo:
1. Inteligencia artificial
2. Automatización
3. Auditoría avanzada
4. Nuevos campos de negocio (protocolo de sala)
