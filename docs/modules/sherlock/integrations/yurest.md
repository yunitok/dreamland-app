# 🔌 Guía de Integración: Yurest

## Resumen

Esta guía detalla la integración de Sherlock con la plataforma **Yurest WebService API** para importar y sincronizar datos de ingredientes, recetas e inventario.

---

## 🔑 Autenticación

### Método: Token API
Yurest utiliza autenticación por token enviado en headers.

```typescript
const YUREST_API_URL = process.env.YUREST_API_URL;
const YUREST_TOKEN = process.env.YUREST_TOKEN;

const headers = {
  'Authorization': `Bearer ${YUREST_TOKEN}`,
  'Content-Type': 'application/json'
};
```

### Obtención del Token
1. Contactar con soporte de Yurest
2. Solicitar token de API para tu restaurante
3. Añadir a `.env`:
   ```env
   YUREST_API_URL=https://api.yurest.com
   YUREST_TOKEN=your_unique_token_here
   ```

---

## 📡 Endpoints Principales

### 1. Ingredientes

#### GET `/ingredients`
Obtener listado completo de ingredientes.

**Response**:
```json
{
  "status": 1,
  "message": "Success",
  "data": [
    {
      "id": "ing_123",
      "name": "Tomate Rama",
      "category": "Verduras",
      "unitType": "Kg",
      "currentPrice": 2.50,
      "supplierId": "sup_456",
      "isBuyable": true,
      "isSellable": false,
      "taxRate": 0.10,
      "currentStock": 15.5,
      "minStock": 10,
      "shelfLife": 7,
      "storageTemp": 4.0,
      "yield": 0.92
    }
  ]
}
```

**Mapeo a Sherlock**:
```typescript
const mapYurestIngredient = (yurestData): IngredientCreateInput => ({
  name: yurestData.name,
  // normalizedName: Se genera con IA después
  categoryId: await findOrCreateCategory(yurestData.category),
  unitTypeId: await findMeasureUnit(yurestData.unitType),
  cost: yurestData.currentPrice,
  taxRate: yurestData.taxRate,
  isBuyable: yurestData.isBuyable,
  isSellable: yurestData.isSellable,
  currentStock: yurestData.currentStock,
  minStock: yurestData.minStock,
  shelfLife: yurestData.shelfLife,
  storageTemp: yurestData.storageTemp,
  yield: yurestData.yield,
  supplierId: await findOrCreateSupplier(yurestData.supplierId)
});
```

---

### 2. Recetas

#### GET `/recipes`
Obtener recetario completo.

**Response**:
```json
{
  "status": 1,
  "data": [
    {
      "id": "rec_789",
      "name": "Paella Valenciana",
      "category": "Principales",
      "prepTime": 30,
      "steps": [
        "Sofreír el pollo",
        "Añadir el arroz",
        "Cocinar 18 minutos"
      ],
      "multimedia": {
        "photos": ["https://yurest-cdn.com/paella.jpg"],
        "videos": ["https://yurest-cdn.com/paella-video.mp4"]
      },
      "cost": 24.50,
      "ingredients": [
        {
          "ingredientId": "ing_123",
          "quantity": 0.5,
          "unit": "Kg"
        }
      ]
    }
  ]
}
```

**Mapeo a Sherlock**:
```typescript
const mapYurestRecipe = async (yurestData): Promise<RecipeCreateInput> => {
  // 1. Crear receta base
  const recipe = await prisma.recipe.create({
    data: {
      name: yurestData.name,
      categoryId: await findOrCreateRecipeCategory(yurestData.category),
      prepTime: yurestData.prepTime,
      steps: yurestData.steps,
      photos: yurestData.multimedia?.photos || [],
      videos: yurestData.multimedia?.videos || [],
      theoreticalCost: yurestData.cost
    }
  });

  // 2. Crear relaciones con ingredientes
  for (const ing of yurestData.ingredients) {
    await prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: await mapIngredientId(ing.ingredientId),
        quantity: ing.quantity,
        unitId: await findMeasureUnit(ing.unit)
      }
    });
  }

  return recipe;
};
```

---

### 3. Inventario

#### GET `/inventory`
Obtener registros de inventario con trazabilidad.

**Response**:
```json
{
  "status": 1,
  "data": [
    {
      "ingredientId": "ing_123",
      "quantity": 15.5,
      "location": "Cámara Fría",
      "expiryDate": "2026-02-25",
      "productionDate": "2026-02-10",
      "lotNumber": "LOT-2024-456",
      "batchNumber": "BATCH-123"
    }
  ]
}
```

**Mapeo a Sherlock**:
```typescript
const mapYurestInventory = (yurestData): InventoryRecordCreateInput => ({
  ingredientId: await mapIngredientId(yurestData.ingredientId),
  quantity: yurestData.quantity,
  location: yurestData.location,
  expiryDate: new Date(yurestData.expiryDate),
  productionDate: new Date(yurestData.productionDate),
  lotNumber: yurestData.lotNumber,
  batchNumber: yurestData.batchNumber,
  status: 'AVAILABLE'
});
```

---

### 4. Control de Mermas

#### GET `/waste`
Obtener registros de desperdicios.

**Response**:
```json
{
  "status": 1,
  "data": [
    {
      "ingredientId": "ing_123",
      "quantity": 0.5,
      "reason": "EXPIRED",
      "notes": "Caducado antes de uso",
      "date": "2026-02-15"
    }
  ]
}
```

**Mapeo a Sherlock**:
```typescript
const wasteReasonMap = {
  'EXPIRED': 'EXPIRED',
  'BURNED': 'BURNED',
  'SPOILED': 'SPOILED',
  'QUALITY_ISSUE': 'QUALITY_ISSUE',
  'OVERPRODUCTION': 'OVERPRODUCTION',
  'YIELD_LOSS': 'YIELD_LOSS',
  'OTHER': 'OTHER'
};

const mapYurestWaste = (yurestData): WasteRecordCreateInput => ({
  ingredientId: await mapIngredientId(yurestData.ingredientId),
  quantity: yurestData.quantity,
  reason: wasteReasonMap[yurestData.reason] || 'OTHER',
  notes: yurestData.notes,
  createdAt: new Date(yurestData.date)
});
```

---

## 🔄 Script de Importación Completa

### Archivo: `scripts/import-yurest.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const YUREST_API = process.env.YUREST_API_URL!;
const YUREST_TOKEN = process.env.YUREST_TOKEN!;

async function fetchYurest(endpoint: string) {
  const response = await fetch(`${YUREST_API}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${YUREST_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const json = await response.json();
  if (json.status !== 1) {
    throw new Error(`Yurest API error: ${json.message}`);
  }

  return json.data;
}

async function importIngredients() {
  console.log('📦 Importing ingredients from Yurest...');
  const ingredients = await fetchYurest('/ingredients');

  for (const yurestIng of ingredients) {
    try {
      await prisma.ingredient.upsert({
        where: { reference: `yurest_${yurestIng.id}` },
        update: {
          cost: yurestIng.currentPrice,
          currentStock: yurestIng.currentStock
        },
        create: await mapYurestIngredient(yurestIng)
      });
    } catch (error) {
      console.error(`Error importing ${yurestIng.name}:`, error);
    }
  }

  console.log(`✅ Imported ${ingredients.length} ingredients`);
}

async function importRecipes() {
  console.log('📝 Importing recipes from Yurest...');
  const recipes = await fetchYurest('/recipes');

  for (const yurestRec of recipes) {
    try {
      await mapYurestRecipe(yurestRec);
    } catch (error) {
      console.error(`Error importing ${yurestRec.name}:`, error);
    }
  }

  console.log(`✅ Imported ${recipes.length} recipes`);
}

async function importInventory() {
  console.log('📊 Importing inventory from Yurest...');
  const inventory = await fetchYurest('/inventory');

  // Limpiar inventario actual
  await prisma.inventoryRecord.deleteMany({
    where: { createdAt: { lt: new Date() } }
  });

  for (const invRecord of inventory) {
    try {
      await prisma.inventoryRecord.create({
        data: await mapYurestInventory(invRecord)
      });
    } catch (error) {
      console.error(`Error importing inventory record:`, error);
    }
  }

  console.log(`✅ Imported ${inventory.length} inventory records`);
}

async function main() {
  await importIngredients();
  await importRecipes();
  await importInventory();
  console.log('🎉 Yurest import completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## ⏱️ Sincronización Incremental

### Estrategia: Polling
Yurest no soporta webhooks, por lo que usamos polling.

```typescript
// Cron job: cada 1 hora
import cron from 'node-cron';

cron.schedule('0 * * * *', async () => {
  console.log('🔄 Running Yurest sync...');

  // 1. Sync prices  
  const ingredients = await fetchYurest('/ingredients');
  for (const ing of ingredients) {
    const current = await prisma.ingredient.findUnique({
      where: { reference: `yurest_${ing.id}` }
    });

    if (current && current.cost !== ing.currentPrice) {
      // Actualizar precio
      await prisma.ingredient.update({
        where: { id: current.id },
        data: { cost: ing.currentPrice }
      });

      // Crear histórico
      await prisma.priceHistory.create({
        data: {
          ingredientId: current.id,
          price: ing.currentPrice,
          reason: 'Actualización desde Yurest'
        }
      });
    }
  }

  // 2. Sync stock
  const inventory = await fetchYurest('/inventory');
  // ... similar logic

  console.log('✅ Yurest sync completed');
});
```

---

## 🚨 Manejo de Errores

```typescript
class YurestAPIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

async function fetchYurestSafe(endpoint: string) {
  try {
    const response = await fetch(`${YUREST_API}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${YUREST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      throw new YurestAPIError(
        `HTTP ${response.status}`,
        response.status
      );
    }

    const json = await response.json();
    if (json.status !== 1) {
      throw new YurestAPIError(json.message, 400);
    }

    return json.data;
  } catch (error) {
    if (error instanceof YurestAPIError) {
      console.error(`Yurest API error: ${error.message}`);
      // Log to monitoring system
    } else {
      console.error(`Network error:`, error);
    }
    throw error;
  }
}
```

---

## 📊 Campos Únicos de Sherlock

Estos campos NO existen en Yurest, se generan localmente:

- `Ingredient.normalizedName` - Generado por IA
- `Ingredient.aiNormalizedGroup` - Generado por IA
- `Recipe.protocoloDeSala` - Creado manualmente
- `Recipe.aiGenerated` - Flag local
- `VoiceAudit.*` - Tabla local

---

## 🔗 Referencias

- [Yurest Analysis](../analysis/yurest.md)
- [Comparative Analysis](../analysis/comparison.md)
- [Prisma Schema](../schema/prisma-schema.md)
