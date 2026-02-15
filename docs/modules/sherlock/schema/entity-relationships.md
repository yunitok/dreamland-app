# 📊 Diagramas de Entidad-Relación

Este documento contiene los diagramas visuales del esquema de base de datos de Sherlock.

---

## Diagrama ER Completo

```mermaid
erDiagram
    MeasureUnit ||--o{ Ingredient : "uses"
    MeasureUnit ||--o{ RecipeIngredient : "measures"
    
    Category ||--o{ Ingredient : "categorizes"
    Category ||--o{ Category : "parent-child"
    
    RecipeCategory ||--o{ Recipe : "categorizes"
    RecipeFamily ||--o{ Recipe : "groups"
    
    Supplier ||--o{ Ingredient : "supplies"
    
    Ingredient ||--o{ RecipeIngredient : "used in"
    Ingredient ||--o{ InventoryRecord : "tracked"
    Ingredient ||--o{ WasteRecord : "wasted"
    Ingredient ||--o{ PriceHistory : "price changes"
    
    Recipe ||--o{ RecipeIngredient : "contains"
    Recipe ||--o{ RecipeSubrecipe : "uses subrecipes"
    Recipe ||--o{ VoiceAudit : "audited by"
    Recipe ||--o{ ProductionBatch : "produced in"
    
    MeasureUnit {
        string id PK
        string name
        string abbreviation UK
        UnitType type
        float conversionFactor
        boolean isBase
        datetime createdAt
        datetime updatedAt
    }
    
    Category {
        string id PK
        string name
        string description
        string parentId FK
        datetime createdAt
        datetime updatedAt
    }
    
    Ingredient {
        string id PK
        string name
        string normalizedName
        string description
        string reference UK
        string categoryId FK
        string unitTypeId FK
        float cost
        float taxRate
        boolean isBuyable
        boolean isSellable
        float currentStock
        float minStock
        float maxStock
        int shelfLife
        float storageTemp
        float yield
        string supplierId FK
        string aiNormalizedGroup
        float aiConfidence
        IngredientStatus status
        datetime createdAt
        datetime updatedAt
    }
    
    Recipe {
        string id PK
        string name
        string description
        string categoryId FK
        string familyId FK
        int prepTime
        int cookTime
        int servings
        array steps
        array photos
        array videos
        float theoreticalCost
        float realCost
        float variance
        float variancePercent
        text protocoloDeSala
        boolean aiGenerated
        text aiPrompt
        string aiVersion
        RecipeStatus status
        datetime createdAt
        datetime updatedAt
    }
    
    RecipeIngredient {
        string id PK
        string recipeId FK
        string ingredientId FK
        float quantity
        string unitId FK
        string notes
        int order
        datetime createdAt
        datetime updatedAt
    }
    
    RecipeSubrecipe {
        string id PK
        string parentId FK
        string childId FK
        float quantity
        string notes
        datetime createdAt
        datetime updatedAt
    }
    
    InventoryRecord {
        string id PK
        string ingredientId FK
        float quantity
        string location
        datetime expiryDate
        datetime productionDate
        datetime freezeDate
        datetime openDate
        string lotNumber
        string batchNumber
        InventoryStatus status
        datetime createdAt
        datetime updatedAt
    }
    
    WasteRecord {
        string id PK
        string ingredientId FK
        float quantity
        WasteReason reason
        string notes
        string responsibleUserId
        boolean detectedByAI
        text audioTranscript
        float confidenceScore
        datetime createdAt
    }
    
    VoiceAudit {
        string id PK
        string recipeId FK
        string audioUrl
        text transcription
        json discrepancies
        float score
        string modelVersion
        string auditorUserId
        string productionBatchId
        datetime createdAt
    }
    
    PriceHistory {
        string id PK
        string ingredientId FK
        float price
        datetime effectiveAt
        string supplierId
        string reason
    }
    
    ProductionBatch {
        string id PK
        string recipeId FK
        float quantity
        datetime plannedDate
        datetime producedDate
        float plannedCost
        float actualCost
        string supervisorUserId
        ProductionStatus status
        datetime createdAt
        datetime updatedAt
    }
```

---

## Diagrama por Módulos

### Módulo: Gestión de Unidades
```mermaid
graph TB
    A[MeasureUnit] -->|type| B[WEIGHT]
    A -->|type| C[VOLUME]
    A -->|type| D[UNIT]
    
    B -->|examples| E[Kg factor=1.0<br/>g factor=0.001<br/>mg factor=0.000001]
    C -->|examples| F[L factor=1.0<br/>mL factor=0.001<br/>cL factor=0.01]
    D -->|examples| G[Ud factor=1.0<br/>Docena factor=12<br/>Caja factor=24]
```

### Módulo: Ingredientes con Normalización IA
```mermaid
graph LR
    A[Ingredient: Tomate] -->|normalizedName| B["Tomate"]
    C[Ingredient: Tomate Frito] -->|normalizedName| B
    D[Ingredient: Salsa Tomate] -->|normalizedName| B
    
    A -->|aiNormalizedGroup| E["tomate_products"]
    C -->|aiNormalizedGroup| E
    D -->|aiNormalizedGroup| E
    
    E -->|confidence| F[0.95]
```

### Módulo: Recetas Jerárquicas
```mermaid
graph TD
    A[Recipe: Paella Valenciana] -->|RecipeIngredient| B[Arroz 400g]
    A -->|RecipeIngredient| C[Pollo 300g]
    A -->|RecipeSubrecipe| D[Recipe: Sofrito 150g]
    
    D -->|RecipeIngredient| E[Tomate 100g]
    D -->|RecipeIngredient| F[Cebolla 50g]
    D -->|RecipeIngredient| G[Ajo 20g]
    
    A -->|theoreticalCost| H[€24.50]
    A -->|realCost| I[€27.00]
    A -->|variance| J[€2.50 - 10.2%]
```

### Módulo: Control de Inventario
```mermaid
graph TB
    A[Ingredient: Pollo] -->|InventoryRecord #1| B[Location: Cámara<br/>Quantity: 5kg<br/>Expiry: 2026-02-20<br/>Lot: LOT-2345]
    A -->|InventoryRecord #2| C[Location: Congelador<br/>Quantity: 10kg<br/>Freeze: 2026-01-10<br/>Lot: LOT-2301]
    
    B -->|status| D[AVAILABLE]
    C -->|status| E[AVAILABLE]
    
    A -->|WasteRecord| F[Quantity: 0.5kg<br/>Reason: SPOILED<br/>Date: 2026-02-15]
```

### Módulo: Auditoría por Voz
```mermaid
sequenceDiagram
    participant C as Cocinero
    participant S as Sistema
    participant W as Whisper
    participant L as LLM
    participant D as Database
    
    C->>S: Graba audio cocinando
    S->>W: Transcribe audio
    W-->>S: "Añado 50g de sal, 200ml de aceite"
    S->>D: Fetch recipe specification
    D-->>S: Recipe: sal=20g, aceite=200ml
    S->>L: Compare transcription vs recipe
    L-->>S: Discrepancies: {salt: +30g}
    S->>D: Create VoiceAudit (score: 65/100)
    S-->>C: Alert: Desviación en sal detectada
```

---

## Flujos de Datos Principales

### Flujo 1: Importación desde Yurest
```mermaid
flowchart LR
    A[Yurest API] -->|GET /ingredients| B[Raw Data]
    B -->|Transform| C[Sherlock Format]
    C -->|AI Normalize| D[LLM Analysis]
    D -->|normalizedName| E[Ingredient Table]
    E -->|Create| F[PriceHistory]
```

### Flujo 2: Cálculo de Coste de Receta
```mermaid
flowchart TD
    A[Recipe] --> B{Has Subrecipes?}
    B -->|Yes| C[Calculate Subrecipe Costs]
    B -->|No| D[Sum Ingredient Costs]
    C --> E[Sum All Costs]
    D --> E
    E --> F[Apply Yield Factor]
    F --> G[theoreticalCost]
    
    H[ProductionBatch] -->|actualCost| I[Compare]
    G --> I
    I -->|variance| J[Waste Detection]
```

### Flujo 3: Detección de Desperdicios
```mermaid
flowchart TB
    A[Production] --> B{Cost Variance > 10%?}
    B -->|Yes| C[Flag for Review]
    B -->|No| D[Normal]
    
    E[Voice Audit] -->|score < 70| F[Flag Discrepancies]
    
    G[Manual Entry] --> H[WasteRecord]
    
    C --> I[AI Analysis]
    F --> I
    I -->|Suggest Improvements| J[Optimization Report]
```

---

## Índices y Optimización

### Índices Principales
```sql
-- Búsqueda de ingredientes
CREATE INDEX idx_ingredient_normalized_name ON ingredients(normalized_name);
CREATE INDEX idx_ingredient_ai_group ON ingredients(ai_normalized_group);

-- Filtrado de recetas
CREATE INDEX idx_recipe_status ON recipes(status);
CREATE INDEX idx_recipe_category ON recipes(category_id);

-- Alertas de stock
CREATE INDEX idx_inventory_expiry ON inventory_records(expiry_date);
CREATE INDEX idx_ingredient_stock ON ingredients(current_stock);

-- Auditorías
CREATE INDEX idx_voice_audit_score ON voice_audits(score);
CREATE INDEX idx_voice_audit_date ON voice_audits(created_at);

-- Histórico de precios
CREATE INDEX idx_price_history_date ON price_history(effective_at);
```

---

## Tamaños Estimados

| Tabla | Registros (Año 1) | Tamaño Estimado |
|-------|-------------------|-----------------|
| Ingredient | ~2,000 | 500 KB |
| Recipe | ~500 | 2 MB |
| RecipeIngredient | ~5,000 | 300 KB |
| InventoryRecord | ~10,000 | 1.5 MB |
| WasteRecord | ~3,000 | 400 KB |
| VoiceAudit | ~1,000 | 50 MB (audio refs) |
| PriceHistory | ~20,000 | 2 MB |
| **TOTAL** | | **~56.7 MB** |

---

## Estrategias de Escalado

### Particionamiento
```sql
-- Particionar PriceHistory por fecha
CREATE TABLE price_history_2026_q1 PARTITION OF price_history
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE price_history_2026_q2 PARTITION OF price_history
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
```

### Archivado
```sql
-- Mover VoiceAudits > 6 meses a tabla de archivo
INSERT INTO voice_audits_archive
SELECT * FROM voice_audits
WHERE created_at < NOW() - INTERVAL '6 months';

DELETE FROM voice_audits
WHERE created_at < NOW() - INTERVAL '6 months';
```

---

## Referencias Técnicas

- [Prisma Schema Full](./prisma-schema.md)
- [Design Decisions](./design-decisions.md)
- [Yurest Data Model](../analysis/yurest.md#data-model)
- [Gstock Data Model](../analysis/gstock.md#data-model)
