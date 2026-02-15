---
title: Gstock API Analysis
---

# 🕵️ Sherlock: Análisis de Integración con Gstock: Plataforma de Gestión de Inventario y Compras

## Resumen Ejecutivo

Gstock es una **plataforma de operaciones para hostelería** especializada en:
- Gestión de compras centralizadas
- Control de inventario
- Gestión de costes de alimentos
- Visibilidad en tiempo real de niveles de stock

---

## 🔌 API y Capacidades de Integración

### Información General
- **Tipo de API**: REST o SOAP
- **Autenticación**: **OAuth2** (segura y estándar)
- **Documentación**: Disponible en [g-stock.net](https://g-stock.net)
- **Precio**: 
  - Endpoints "Free": Sin coste
  - Endpoints de pago: **€0.001 por llamada** (desde 01/09/2025)
  - Límites configurables desde la aplicación
  - Reportes de uso disponibles

### Autenticación OAuth2
```http
POST /oauth/token
Content-Type: application/json

{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}

Response:
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Uso del token**:
```http
GET /api/products
Authorization: Bearer {access_token}
```

---

### Webhooks (Verificación HMAC)
Para verificar la autenticidad de webhooks:
```javascript
// Verificación de firma HMAC
const signature = request.headers['X-Gstock-Signature'];
const payload = request.body;
const secret = 'your_webhook_secret';

const computedSignature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature === computedSignature) {
  // Webhook válido
}
```

---

### Paginación
```http
GET /api/products?pageNumber=1&pageSize=50
```

**Respuesta**:
```json
{
  "data": [...],
  "page": {
    "rows": 250,      // Total de registros
    "pages": 5        // Total de páginas
  }
}
```

---

## 📊 Modelo de Datos: Endpoints Disponibles

### 1. **Módulo de Compras** (🚨 CRÍTICO PARA SHERLOCK)

#### **Categorías de Productos** (`/purchases/categories`)
- Organización jerárquica de productos
- Clasificación para análisis

#### **Subtipos de Productos** (`/purchases/subtypes`)
- Clasificación más granular

#### **Unidades de Medida** (`/purchases/measure-units`)
- Kg, L, Unidad, Cajas, etc.
- **MUY IMPORTANTE**: Sistema de conversión de unidades
- Factores de conversión entre unidades

---

### 2. **Módulo de Ventas**

#### **Categorías de Punto de Venta** (`/sales/pos-categories`)
- Categorías para organizar productos en TPV

#### **Datos de Ventas en Tiempo Real** (`/sales/real-time`)
- Ventas actuales del día
- Sincronización con TPV

#### **Facturas de Venta** (`/sales/invoices`)
- Historial de facturas
- Datos para contabilidad

---

### 3. **Módulo de Cocina** (🚨 CRÍTICO PARA SHERLOCK)

#### **Categorías de Recetas** (`/kitchen/recipe-categories`)
- Clasificación de recetas

#### **Familias de Recetas** (`/kitchen/recipe-families`)
- Agrupación de recetas relacionadas

#### **Unidades de Subrecetas** (`/kitchen/subrecipe-units`)
- Soporte para **recetas jerárquicas**
- Una receta puede ser ingrediente de otra

---

### 4. **Módulo de Informes** (⭐ MUY RELEVANTE)

#### **Coste Real** (`/reports/cost-real`)
- Coste real de productos consumidos
- Datos históricos reales

#### **Coste Teórico** (`/reports/cost-theoretical`)
- Coste esperado según recetas y ventas
- **CRÍTICO**: Comparación Teórico vs Real = Detección de desperdicios

#### **Variación de Stock** (`/reports/stock-variation`)
- Cambios en inventario
- Identificación de mermas

#### **Stock Teórico** (`/reports/stock-theoretical`)
- Inventario esperado según compras y ventas

#### **Ventas** (`/reports/sales`)
- Reportes de ventas detallados

---

### 5. **Módulo de Almacén**
- Operaciones de almacén
- Movimientos de stock
- Transferencias entre almacenes

---

### 6. **Configuración**
- Endpoints para configurar la plataforma
- Parámetros de sistema

---

### 7. **Integraciones**
- Conexiones con sistemas de terceros
- TPV (Ágora, Deliverect)
- ERPs contables (SAGE 200C, A3ERP, SAP, Navision/Business Central)

---

## 🔗 Capacidades de Exportación

### Exportación de Productos a Excel
- Formato: **.xlsx**
- **Filtros disponibles**:
  - Por categoría
  - Por familia
  - Por proveedor
  - Por estado del producto

**Campos incluidos en exportación**:
```
- Referencia del producto
- Nombre
- Categoría
- Precios (coste, venta)
- Impuestos (IVA)
- Unidades de medida
- Detalles del proveedor
- Estado (activo/inactivo)
```

### Exportación a ERP Contable
- **Dirección**: Unidireccional (Gstock → ERP)
- **Formatos**: Excel, CSV, TXT, JSON, XML
- **Métodos de entrega**:
  - Manual
  - FTP
  - API

---

## 📋 Modelo de Datos Inferido

### Entidades Principales

#### `Product` (Producto Base)
```typescript
interface Product {
  id: string;
  reference: string;           // Código/SKU
  name: string;
  categoryId: string;
  subtypeId?: string;
  supplierId: string;
  measureUnitId: string;       // Unidad de medida
  costPrice: number;           // Precio de coste
  sellPrice?: number;          // Precio de venta
  taxRate: number;             // IVA
  status: 'active' | 'inactive';
  
  // Campos de inventario
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
}
```

#### `MeasureUnit` (Unidad de Medida)
```typescript
interface MeasureUnit {
  id: string;
  name: string;               // "Kilogramo", "Litro", "Unidad"
  abbreviation: string;       // "Kg", "L", "Ud"
  type: 'weight' | 'volume' | 'unit';
  conversionFactor?: number;  // Para conversión a unidad base
}
```

#### `Recipe` (Receta)
```typescript
interface Recipe {
  id: string;
  name: string;
  categoryId: string;
  familyId?: string;
  
  // Soporte para jerarquías
  ingredients: RecipeIngredient[];
  subrecipes?: RecipeSubrecipe[];
  
  // Costes
  theoreticalCost: number;    // Calculado
  realCost?: number;          // Del sistema
}

interface RecipeIngredient {
  productId: string;
  quantity: number;
  measureUnitId: string;
}

interface RecipeSubrecipe {
  subrecipeId: string;        // ID de otra receta
  quantity: number;
  unitId: string;
}
```

#### `StockMovement` (Movimiento de Stock)
```typescript
interface StockMovement {
  id: string;
  productId: string;
  type: 'purchase' | 'sale' | 'waste' | 'transfer' | 'adjustment';
  quantity: number;
  unitPrice?: number;
  totalCost?: number;
  date: Date;
  warehouseId?: string;
  reason?: string;            // Para mermas
  invoiceId?: string;
}
```

#### `CostReport` (Informe de Costes)
```typescript
interface CostReport {
  productId: string;
  period: {
    start: Date;
    end: Date;
  };
  theoreticalCost: number;    // Según recetas y ventas
  realCost: number;           // Según compras reales
  variance: number;           // Diferencia (desperdicio potencial)
  variancePercentage: number; // %
}
```

---

## 🎯 Funcionalidades Clave para Sherlock

### ✅ Lo que Gstock YA hace bien
1. **Gestión Centralizada de Compras**:
   - Control de múltiples proveedores
   - Seguimiento de precios históricos

2. **Análisis de Costes Teórico vs Real**:
   - Detecta automáticamente desperdicios
   - Compara lo esperado con lo real

3. **Soporte para Recetas Jerárquicas**:
   - Subrecetas como ingredientes
   - Estructuras complejas

4. **Integraciones Robustas**:
   - TPV, ERPs contables, BI
   - API bidireccional

5. **Exportaciones Flexibles**:
   - Múltiples formatos
   - Filtros personalizables

---

### ❓ Gaps que Sherlock podría llenar
1. **IA para Optimización de Costes**:
   - Gstock muestra la variación, pero no sugiere soluciones
   - Sherlock podría usar IA para recomendar recetas alternativas

2. **Auditoría por Voz**:
   - Gstock no menciona transcripción de audio
   - Sherlock añade verificación mediante voz en cocina

3. **Normalización Inteligente de Productos**:
   - Fusionar duplicados automáticamente
   - "Tomate", "Tomate Rama", "Tomate Cherry" → relaciones semánticas

---

## 🔗 Oportunidades de Integración

### Integración Bidireccional
1. **Sherlock → Gstock**:
   - Actualizar recetas optimizadas
   - Registrar mermas detectadas por auditoría IA

2. **Gstock → Sherlock**:
   - **Sincronizar catálogo de productos** (crítico)
   - Obtener **precios actualizados** en tiempo real
   - Importar **datos de coste real vs teórico** para análisis
   - Sincronizar **niveles de stock**

### Método de Integración Recomendado
- **API REST de Gstock** como fuente principal de datos de inventario
- **OAuth2** para autenticación segura
- **Webhooks** para notificaciones en tiempo real:
  - Cambio de precio
  - Bajo stock
  - Nueva compra registrada
- **Sincronización periódica** como backup (cada 6-12 horas)

---

## 🆚 Comparación con Yurest

| Aspecto | Yurest | Gstock |
|---------|--------|--------|
| **Enfoque principal** | ERP completo (cocina, RRHH, finanzas) | Compras + Inventario + Costes |
| **Gestión de recetas** | ✅ Avanzada (multimedia, pasos) | ✅ Buena (jerarquías) |
| **Control de inventario** | ✅ Tiempo real + predictivo | ✅ Tiempo real + histórico |
| **Análisis de costes** | ✅ Escandallos automáticos | ✅ Teórico vs Real |
| **Autenticación API** | Token simple | **OAuth2** (más seguro) |
| **Exportaciones** | Limitadas (API) | **Excel, CSV, JSON, XML, FTP** |
| **Integraciones** | API propia | **TPV, ERP, BI bidireccional** |
| **Precio API** | No especificado | €0.001/call (económico) |
| **Detección de mermas** | ✅ Registro manual | ✅ **Automático** (variación de costes) |

---

## 🚀 Próximos Pasos

### Para Integración
1. **Solicitar acceso a API de Gstock**:
   - Obtener `client_id` y `client_secret`
   - Documentación completa de endpoints

2. **Probar endpoints clave**:
   - `/purchases/products` (GET)
   - `/kitchen/recipes` (GET)
   - `/reports/cost-real` (GET)
   - `/reports/cost-theoretical` (GET)

3. **Configurar webhooks**:
   - Definir eventos clave (cambio de precio, bajo stock)
   - Implementar verificación HMAC

4. **Definir mapeo de datos**:
   - Crear tabla Gstock ↔ Sherlock
   - Manejar conversión de unidades

---

### Para Diseño de Sherlock
1. **Adoptar estructura compatible**:
   - Sistema de unidades de medida similar
   - Soporte para recetas jerárquicas

2. **Aprovechar análisis de Gstock**:
   - Usar datos de "Coste Teórico vs Real" para entrenar IA
   - Detectar patrones de desperdicio

3. **Añadir valor único**:
   - IA para recomendar recetas alternativas cuando el coste sube
   - Auditoría por voz en cocina
   - Normalización semántica de ingredientes

---

## 📚 Referencias
- [Gstock API Documentation](https://g-stock.net)
- [Gstock - GetApp](https://www.getapp.com/industries-software/a/g-stock/)
- Integraciones: TPV (Ágora, Deliverect), ERPs (SAGE, SAP, Navision)
