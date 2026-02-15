# 🏗️ Decisiones de Diseño del Esquema Sherlock

## Resumen

Este documento explica las decisiones clave tomadas en el diseño del esquema de base de datos de Sherlock, basadas en el análisis de Yurest y Gstock.

---

## ✅ Decisión 1: Sistema de Unidades de Medida Normalizado

**Adoptado de**: Gstock  
**Razón**: Escalabilidad y conversión automática

### Implementación
- Tabla `MeasureUnit` con factores de conversión
- Tipos: `WEIGHT`, `VOLUME`, `UNIT`
- Campo `isBase` para unidades base (Kg, L, Ud)

### Ventajas
- Conversión automática entre unidades (g → Kg, mL → L)
- Facilita cálculos de costes
- Estándar de industria compatible con Gstock

### Ejemplo
```sql
-- Kg es la base de WEIGHT con factor 1
INSERT INTO measure_units (name, abbreviation, type, conversionFactor, isBase)
VALUES ('Kilogramo', 'Kg', 'WEIGHT', 1.0, true);

-- Gramo se convierte a Kg dividiendo por 1000
INSERT INTO measure_units (name, abbreviation, type, conversionFactor, isBase)
VALUES ('Gramo', 'g', 'WEIGHT', 0.001, false);
```

---

## ✅ Decisión 2: Soporte para Subrecetas (Recetas Jerárquicas)

**Adoptado de**: Gstock  
**Razón**: Recetas complejas requieren usar otras recetas como ingredientes

### Implementación
- Tabla `RecipeSubrecipe` separada de `Recipe Ingredient`
- Relaciones recursivas en `Recipe`

### Ventajas
- Una salsa puede ser "ingrediente" de un plato principal
- Facilita costeo jerárquico
- Reutilización de recetas

### Ejemplo
```prisma
model RecipeSubrecipe {
  parentId String  // Paella
  childId  String  // Sofrito (subreceta)
  quantity Float   // 200g
}
```

---

## ✅ Decisión 3: Trazabilidad Completa

**Adoptado de**: Yurest  
**Razón**: Cumplimiento normativo y control de calidad

### Implementación en `InventoryRecord`
```prisma
expiryDate     DateTime?
productionDate DateTime?
freezeDate     DateTime?
openDate       DateTime?
lotNumber      String?
batchNumber    String?
```

### Ventajas
- Cumple con normativas de seguridad alimentaria
- Permite auditorías completas
- Facilita detección de problemas de calidad

---

## ✅ Decisión 4: Doble Sistema de Detección de Mermas

**Combinado**: Yurest (manual) + Gstock (automático) + Sherlock (IA)

### Implementación
1. **Manual** (Yurest): Tabla `WasteRecord` con enum `WasteReason`
2. **Automático** (Gstock): Campos `theoreticalCost` vs `realCost` en `Recipe`
3. **IA** (Sherlock): Campos `detectedByAI`, `audioTranscript`, `confidenceScore` en `WasteRecord`

### Ventajas
- Triple capa de seguridad
- Detección proactiva (IA) + reactiva (manual)
- Trazabilidad completa de origen del desperdicio

---

## ✅ Decisión 5: Normalización Semántica de Ingredientes (IA)

**Innovación Sherlock**  
**Problema**: "Tomate", "Tomate Frito", "Salsa Tomate" como entidades separadas

### Implementación en `Ingredient`
```prisma
normalizedName    String?  // "Tomate" (nombre canónico)
aiNormalizedGroup String?  // "tomate_products"
aiConfidence      Float?   // 0.95 (95% de confianza)
```

### Algoritmo Propuesto
1. Al importar ingredientes de Yurest/Gstock
2. LLM analiza nombres y agrupa similares
3. Sugiere fusiones con score de confianza
4. Usuario aprueba o rechaza
5. Sistema mantiene `aiNormalizedGroup` para búsquedas

### Ventajas
- Evita duplicados
- Mejora búsquedas
- Facilita análisis de costes

---

## ✅ Decisión 6: Protocolo de Sala

**Innovación Sherlock**  
**Justificación**: Cada plato tiene instrucciones de servicio

### Implementación en `Recipe`
```prisma
protocoloDeSala String? @db.Text
```

### Contenido Sugerido
```markdown
### Protocolo de Sala: Paella Valenciana

**Emplatado**:
- Servir en paellera de 26cm
- Temperatura: 65-70°C
- Guarnición: cuña de limón

**Alergias**:
- Contiene: mariscos, moluscos
- Sin gluten
- Puede contener trazas de pescado

**Maridaje sugerido**:
- Vino blanco albariño (frío 8-10°C)
- Cerveza rubia

**Presentación**:
- Llevar paellera a mesa antes de emplatar
- Explicar ingredientes al cliente
- Servir de fuera hacia dentro
```

### Ventajas
- Estandariza servicio de sala
- Información de alergias inmediata
- Mejora experiencia del cliente

---

## ✅ Decisión 7: Auditoría por Voz

**Innovación Sherlock**  
**Problema**: Verificar adherencia a recetas en cocina sin interrumpir

### Implementación: Tabla `VoiceAudit`
```prisma
model VoiceAudit {
  recipeId      String
  audioUrl      String
  transcription String @db.Text
  discrepancies Json    // Diferencias detectadas
  score         Float   // 0-100
  modelVersion  String? // "whisper-large-v3"
}
```

### Flujo Propuesto
1. Cocinero graba audio mientras cocina: *"Añado 50 gramos de sal, 200ml de aceite..."*
2. Whisper transcribe audio
3. LLM compara con receta: `{"salt": {"recipe": "20g", "actual": "50g", "variance": "+30g"}}`
4. Score: 65/100 (desviación significativa)
5. Alerta automática a supervisor

### Ventajas
- No interrumpe flujo de cocina
- Detección temprana de errores
- Datos para training

---

## ✅ Decisión 8: Histórico de Precios

**Adoptado de**: Gstock (concept) + Prisma best practices

### Implementación: Tabla `PriceHistory`
```prisma
model PriceHistory {
  ingredientId String
  price        Float
  effectiveAt  DateTime @default(now())
  reason       String?
}
```

### Ventajas
- Análisis de tendencias de costes
- Alertas de subidas de precio
- Datos para ML predictivo

---

## ✅ Decisión 9: Tipos de Enums vs Tablas

### Enums elegidos
- `UnitType`: Solo 3 valores fijos (WEIGHT, VOLUME, UNIT)
- `WasteReason`: Lista cerrada estándar de industria
- `IngredientStatus`, `RecipeStatus`, `InventoryStatus`, `ProductionStatus`

### Tablas elegidas
- `MeasureUnit`: Muchos valores, con metadata (conversión)
- `Category`, `RecipeCategory`, `RecipeFamily`: Jerarquías dinámicas
- `Supplier`: Entidad compleja con relaciones

**Regla**: Enum si <10 valores fijos. Tabla si dinámico o con metadata.

---

## ✅ Decisión 10: Soft Delete vs Hard Delete

**Elección**: Hard Delete con `onDelete: Cascade`  
**Razón**: Datos de restaurante cambian frecuentemente

### Excepciones (Soft Delete manual si necesario)
- Añadir campo `deletedAt DateTime?` solo si se requiere auditoría legal
- Actualmente no implementado en v1

---

## ✅ Decisión 11: Indices Estratégicos

### Criterios de indexación
1. **Foreign Keys**: Todos indexados automáticamente
2. **Búsquedas frecuentes**: 
   - `Ingredient.normalizedName`
   - `Ingredient.aiNormalizedGroup`
3. **Filtros comunes**:
   - `WasteRecord.createdAt` (reportes históricos)
   - `VoiceAudit.score` (auditorías fallidas)
4. **Queries temporales**:
   - `InventoryRecord.expiryDate` (productos a caducar)

### Evitados (por ahora)
- Indices en campos `String` muy largos (`description`, `notes`)
- Búsqueda full-text (usar PostgreSQL `tsvector` si se necesita)

---

## ✅ Decisión 12: Generación de IDs

**Elección**: `cuid()` (Collision-resistant Unique ID)  
**Razón**: Balance entre UUID y auto-increment

### Ventajas sobre UUID
- Más corto (25 chars vs 36)
- Ordenable cronológicamente
- Compatible con URLs

### Ventajas sobre auto-increment
- Seguro (no expone cantidad de registros)
- Funciona en sistemas distribuidos
- No hay colisiones en imports

---

## ✅ Decisión 13: Timestamps Obligatorios

### Estándar aplicado
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Excepciones (sin `updatedAt`)
- `WasteRecord`: Solo importa cuando se creó
- `PriceHistory`: Histórico inmutable
- `VoiceAudit`: Registro de auditoría

---

## 🚀 Campos Exclusivos de Sherlock (Resumen)

| Campo | Modelo | Propósito |
|-------|--------|-----------|
| `normalizedName` | Ingredient | Normalización semántica IA |
| `aiNormalizedGroup` | Ingredient | Agrupación de similares |
| `protocoloDeSala` | Recipe | Instrucciones de servicio |
| `aiGenerated` | Recipe | Marcador de receta generada |
| `aiPrompt` | Recipe | Prompt original usado |
| `detectedByAI` | WasteRecord | Merma detectada por IA |
| `audioTranscript` | WasteRecord | Transcripción del audio |
| `VoiceAudit` | (tabla nueva) | Auditorías por voz completas |
| `ProductionBatch` | (tabla nueva) | Lotes de producción |

---

## 📋 Próximos Pasos

### Fase 2.3: Scripts de Seed
1. Crear `seed.ts` con datos iniciales:
   - Unidades de medida estándar (Kg, g, L, mL, Ud)
   - Categorías básicas
   - Razones de merma predefinidas

### Fase 2.4: Migraciones
1. Generar primera migración
2. Validar con Prisma CLI
3. Probar en desarrollo

### Fase 2.5: Integración Testing
1. Crear scripts de prueba con datos de Yurest
2. Probar importación de datos de Gstock
3. Validar mapeo de campos

---

## 📚 Referencias

- [Análisis de Yurest](./yurest_analysis.md)
- [Análisis de Gstock](./gstock_analysis.md)
- [Comparativa de Plataformas](./integration_comparison.md)
- [Prisma Best Practices](https://www.prisma.io/docs/concepts/components/prisma-schema)
