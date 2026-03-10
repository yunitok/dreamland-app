---
title: Yurest API Analysis
---

# 🕵️ GastroLab: Análisis de Integración con Yurest: Plataforma de Gestión de Restaurantes

## Resumen Ejecutivo

Yurest es un **ERP integral para restaurantes** que gestiona compras, productos, finanzas y recursos humanos en tiempo real. Ofrece una **API WebService** completa para integración con sistemas externos.

---

## 🔌 API y Capacidades de Integración

### Información General
- **URL**: Disponible para entornos de desarrollo y producción
- **Autenticación**: Token único por cliente y entorno
- **Formato de respuesta**: JSON con status HTTP 200
- **Estructura de respuesta**:
  ```json
  {
    "status": 1,          // 0 = error, 1 = éxito
    "message": "...",     // Mensaje descriptivo
    "data": [...]         // Array con datos en JSON
  }
  ```

---

## 📊 Modelo de Datos: Endpoints Disponibles

### 1. **Gestión de Cocina** (🚨 CRÍTICO PARA GASTROLAB)
Endpoints relacionados con la preparación de alimentos:

#### **Recetas** (`/recipes`)
- Permite obtener y gestionar recetas completas
- **Campos esperados**:
  - Nombre de receta
  - Ingredientes con cantidades exactas
  - Instrucciones paso a paso
  - Tiempos de preparación
  - Fotos y videos (soporte multimedia)
  - Escandallos de costes (cálculo automático)
  - Categoría de receta

#### **Menús** (`/menus`)
- Gestión de menús del restaurante
- Relación entre menús y recetas

#### **Producciones** (`/productions`)
- Control de producción en cocina
- Seguimiento de elaboraciones

#### **Planificador de Cocina** (`/kitchen-planner`)
- Programación de tareas de cocina

---

### 2. **Gestión de Inventario** (🚨 CRÍTICO PARA GASTROLAB)

#### **Inventarios** (`/inventories`)
- Seguimiento en tiempo real de niveles de stock
- **Funcionalidades**:
  - Alertas de bajo stock (umbrales personalizables)
  - Análisis predictivo basado en patrones históricos
  - Prevención de excesos y faltantes
- **Campos esperados**:
  - Producto/ingrediente
  - Cantidad actual
  - Unidad de medida
  - Ubicación de almacenamiento
  - Fechas (caducidad, elaboración, congelación, apertura)

---

### 3. **Gestión de Productos y Compras** (🚨 CRÍTICO PARA GASTROLAB)

#### **Productos** (`/products`)
**Operaciones**:
- `GET`: Obtener información de productos
- `UPDATE`: Actualizar información de productos

**Campos disponibles**:
- ID de producto
- Nombre
- IVA aplicado
- Estado: ¿Es comprable? ¿Es vendible?
- Unidad de medida
- Precio de coste
- Proveedor asociado

#### **Fichas de Producto** (`/product-sheets`)
- Información técnica detallada de productos
- Escandallos (fichas de costes)
- Información nutricional y de trazabilidad

---

### 4. **Etiquetado y Trazabilidad**
- **Módulo de etiquetado inteligente**:
  - Códigos con trazabilidad completa
  - Ingredientes, lotes, fechas
  - Cumplimiento normativo (seguridad alimentaria)

---

### 5. **Control de Mermas** (⭐ MUY RELEVANTE PARA GASTROLAB)
- Registro de desperdicios por razón (caducado, quemado, etc.)
- Integración con básculas Wi-Fi
- Control de rendimiento (yield) en procesos:
  - Deshuese
  - Limpieza de vegetales
  - Fileteado de pescado

---

### 6. **Otros Endpoints Disponibles**

#### **Sistema**
- `/stores`: Tiendas/locales
- `/users`: Usuarios del sistema
- `/roles`: Roles y permisos

#### **Informes**
- `/ebitda-summary`: Resumen financiero detallado
  - Notas de entrega
  - Gastos generales
  - Gastos de personal
  - Ventas

#### **Recursos Humanos**
- `/services`: Servicios de restauración
- `/absences`: Ausencias
- `/planning-services`: Planificación de servicios
- `/contracts`: Contratos
- `/shift-planner`: Planificador de turnos

#### **Eventos**
- `/events`: Gestión de eventos
- `/event-menus`: Menús de eventos
- `/event-products`: Productos para eventos

#### **Financiero**
- `/family-expenses`: Gastos familiares
- `/general-expenses`: Gastos generales
- `/personnel-expenses`: Gastos de personal

#### **Tareas**
- `/checklists`: Listas de verificación
- `/audits`: Auditorías

---

## 🎯 Funcionalidades Clave para GastroLab

### ✅ Lo que Yurest YA hace bien
1. **Gestión de Recetas Estructuradas**:
   - Cantidades exactas de ingredientes
   - Pasos detallados
   - Cálculo automático de escandallos (costes)
   - Alertas si el coste de un producto aumenta

2. **Control de Inventario en Tiempo Real**:
   - Alertas automáticas de bajo stock
   - Análisis predictivo

3. **Trazabilidad Completa**:
   - Etiquetado con lotes, fechas, ingredientes

4. **Control de Mermas**:
   - Registro de desperdicios con motivos
   - Cálculo de rendimientos

### ❓ Gaps que GastroLab podría llenar
1. **Auditoría por Voz**:
   - Yurest no menciona transcripción de audio ni IA auditora
   - GastroLab podría añadir verificación mediante voz

2. **Generación IA de Recetas**:
   - Yurest permite crear recetas manualmente
   - GastroLab podría usar IA para generar recetas optimizadas por coste

3. **Análisis Semántico de Ingredientes**:
   - Normalización inteligente ("Tomate", "Tomate Frito", "Salsa Tomate")
   - Yurest no menciona normalización IA

---

## 🔗 Oportunidades de Integración

### Integración Bidireccional Posible
1. **GastroLab → Yurest**:
   - Enviar recetas generadas por IA
   - Actualizar costes optimizados
   - Sincronizar escandallos

2. **Yurest → GastroLab**:
   - Importar catálogo de ingredientes
   - Sincronizar precios actualizados
   - Obtener inventario en tiempo real
   - Importar recetas existentes

### Método de Integración Recomendado
- **API REST de Yurest** como fuente de datos maestra
- **Webhooks** para actualizaciones en tiempo real (verificar si Yurest los soporta)
- **Sincronización periódica** como fallback (cada hora/día)

---

## 📋 Modelo de Datos Inferido

### Entidades Principales

#### `Ingredient` (Ingrediente)
```typescript
interface Ingredient {
  id: string;
  name: string;
  category: string;
  unitType: 'Kg' | 'L' | 'Unidad';
  currentPrice: number;
  supplierId: string;
  isBuyable: boolean;
  isSellable: boolean;
  taxRate: number; // IVA
  currentStock?: number;
  minStock?: number; // Para alertas
  shelfLife?: number; // Días de vida útil
  storageTemp?: number; // Temperatura de conservación
  yield?: number; // Rendimiento (0-1)
}
```

#### `Recipe` (Receta)
```typescript
interface Recipe {
  id: string;
  name: string;
  category: string;
  prepTime: number; // Minutos
  steps: string[]; // Instrucciones paso a paso
  multimedia?: {
    photos: string[];
    videos: string[];
  };
  cost?: number; // Calculado automáticamente
  ingredients: RecipeIngredient[];
}

interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}
```

#### `Inventory` (Inventario)
```typescript
interface Inventory {
  id: string;
  ingredientId: string;
  quantity: number;
  location: string;
  expiryDate?: Date;
  productionDate?: Date;
  lotNumber?: string;
}
```

#### `WasteRecord` (Registro de Merma)
```typescript
interface WasteRecord {
  id: string;
  ingredientId: string;
  quantity: number;
  reason: 'Expired' | 'Burned' | 'Spoiled' | 'Quality' | 'Other';
  date: Date;
  responsibleUserId?: string;
}
```

---

## 🚀 Próximos Pasos

### Para Integración
1. **Solicitar acceso a API de Yurest**:
   - Obtener credenciales (client_id, token)
   - Documentación completa de endpoints

2. **Probar endpoints clave**:
   - `/products` (GET)
   - `/recipes` (GET)
   - `/inventories` (GET)

3. **Definir mapeo de datos**:
   - Crear tabla de correspondencia Yurest ↔ GastroLab
   - Identificar campos obligatorios vs opcionales

### Para Diseño de GastroLab
1. **Reutilizar estructura de Yurest**:
   - Adoptar nomenclatura compatible
   - Mantener campos comunes para facilitar sincronización

2. **Añadir campos exclusivos de GastroLab**:
   - IA generative metadata
   - Audio transcription links
   - Audit scores

---

## 📚 Referencias
- [Yurest API Documentation](https://yurest.com) (requiere acceso con credenciales)
- Características: Gestión de inventario, recetas, etiquetado, control de mermas
