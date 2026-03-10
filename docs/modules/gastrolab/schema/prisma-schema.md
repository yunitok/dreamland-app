---
title: Prisma Schema Reference
---

# Prisma Schema - GastroLab Module

Este documento contiene el esquema completo de base de datos de GastroLab en formato Prisma.

---

## 📋 Resumen del Esquema

| Aspecto | Cantidad |
| --- | --- |
| **Total modelos** | 18 |
| **Enums** | 6 |
| **Relaciones many-to-many** | 2 |
| **Campos únicos GastroLab** | 9 |

---

## 🏗️ Estructura de Modelos

### Core Entities
1. `MeasureUnit` - Unidades de medida con conversiones
2. `Category` - Categorías de ingredientes (jerárquicas)
3. `RecipeCategory` - Categorías de recetas
4. `RecipeFamily` - Familias de recetas
5. `Supplier` - Proveedores

### Main Entities
6. `Ingredient` - Ingredientes/productos con normalización IA
7. `Recipe` - Recetas con protocolo de sala y subrecetas
8. `RecipeIngredient` - Relación many-to-many ingredientes-recetas
9. `RecipeSubrecipe` - Relación recetas jerárquicas

### Inventory & Tracking
10. `InventoryRecord` - Registros de inventario con trazabilidad
11. `WasteRecord` - Control de mermas/desperdicios
12. `PriceHistory` - Histórico de precios

### Production & AI
13. `VoiceAudit` - Auditorías por voz (IA)
14. `ProductionBatch` - Lotes de producción

---

## 📄 Schema Completo

\`\`\`prisma
${await Deno.readTextFile('C:\\Users\\miguel\\.gemini\\antigravity\\brain\\6c33d76b-a6a3-44d9-9bde-b4852842afe3\\gastrolab_schema.prisma')}
\`\`\`

---

## 🔍 Características Clave

### 1. Sistema de Unidades Normalizado
- Tabla `MeasureUnit` con factores de conversión
- Tipos: `WEIGHT`, `VOLUME`, `UNIT`
- Conversión automática (g ↔ Kg, mL ↔ L)

### 2. Normalización Semántica (IA)
```prisma
model Ingredient {
  normalizedName    String?  // "Tomate"
  aiNormalizedGroup String?  // "tomate_products"
  aiConfidence      Float?   // 0.95
}
```

### 3. Protocolo de Sala
```prisma
model Recipe {
  protocoloDeSala String? @db.Text
  // Contiene: emplatado, alergias, maridaje
}
```

### 4. Auditoría por Voz
```prisma
model VoiceAudit {
  audioUrl      String
  transcription String @db.Text
  discrepancies Json
  score         Float  // 0-100
}
```

### 5. Trazabilidad Completa
```prisma
model InventoryRecord {
  expiryDate     DateTime?
  productionDate DateTime?
  freezeDate     DateTime?
  lotNumber      String?
  batchNumber    String?
}
```

---

## 🚀 Uso del Schema

### Generar Migración
\`\`\`bash
npx prisma migrate dev --name initial_gastrolab_schema
\`\`\`

### Generar Cliente
\`\`\`bash
npx prisma generate
\`\`\`

### Seed Database
\`\`\`bash
npx prisma db seed
\`\`\`

---

## 📚 Referencias

- [Design Decisions](./design-decisions.md)
- [Entity Relationships](./entity-relationships.md)
- [Yurest Integration](../integrations/yurest.md)
- [Gstock Integration](../integrations/gstock.md)
