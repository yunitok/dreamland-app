export interface GstockEndpointParam {
  name: string
  label: string
  type: "text" | "number" | "date"
  placeholder?: string
  optional?: boolean
}

export interface GstockEndpoint {
  path: string
  label: string
  description: string
  method: "GET" | "POST"
  sherlockMapping?: string
  requiredParams?: GstockEndpointParam[]
  /** JSON template editable en el sandbox para endpoints POST */
  bodyTemplate?: string
}

export interface GstockEndpointGroup {
  label: string
  color: string
  endpoints: GstockEndpoint[]
}

// Parámetros comunes reutilizables
const CENTER_PARAM: GstockEndpointParam = { name: "centerId", label: "Centro (ID)", type: "number", placeholder: "Ej: 1", optional: true }
const START_DATE_PARAM: GstockEndpointParam = { name: "startDate", label: "Desde", type: "date" }
const END_DATE_PARAM: GstockEndpointParam = { name: "endDate", label: "Hasta", type: "date", optional: true }
const FROM_DATE_PARAM: GstockEndpointParam = { name: "fromDate", label: "Desde", type: "date" }
const TO_DATE_PARAM: GstockEndpointParam = { name: "toDate", label: "Hasta", type: "date" }
const PAGE_NUMBER_PARAM: GstockEndpointParam = { name: "pageNumber", label: "Página", type: "number", placeholder: "Ej: 1" }
const PAGE_SIZE_PARAM: GstockEndpointParam = { name: "pageSize", label: "Registros/página", type: "number", placeholder: "Ej: 50" }

export const GSTOCK_ENDPOINT_GROUPS: GstockEndpointGroup[] = [
  {
    label: "Productos & Compras",
    color: "text-blue-500",
    endpoints: [
      {
        path: "v1/product/purchases",
        label: "Productos de Compra",
        description: "Listado completo de productos de compra con precios, stock y proveedores.",
        method: "GET",
        sherlockMapping: "Ingredient",
      },
      {
        path: "v1/product/purchases/categories",
        label: "Categorías",
        description: "Categorías de productos de compra.",
        method: "GET",
        sherlockMapping: "Category",
      },
      {
        path: "v1/product/purchases/families",
        label: "Familias",
        description: "Familias de productos de compra.",
        method: "GET",
      },
      {
        path: "v1/product/purchases/types",
        label: "Tipos",
        description: "Tipos de productos de compra.",
        method: "GET",
      },
      {
        path: "v1/product/purchases/subtypes",
        label: "Subtipos",
        description: "Subtipos de productos de compra.",
        method: "GET",
      },
      {
        path: "v1/product/purchases/units/measure",
        label: "Unidades de Medida",
        description: "Unidades de medida (Kg, L, Ud, etc.) con factores de conversión.",
        method: "GET",
        sherlockMapping: "MeasureUnit",
      },
      {
        path: "v1/product/purchases/units/display",
        label: "Unidades de Visualización",
        description: "Unidades de visualización de productos.",
        method: "GET",
      },
      {
        path: "v1/product/purchases/formats",
        label: "Formatos",
        description: "Formatos de productos de compra.",
        method: "GET",
      },
    ],
  },
  {
    label: "Proveedores",
    color: "text-purple-500",
    endpoints: [
      {
        path: "v1/suppliers",
        label: "Proveedores",
        description: "Listado de proveedores con datos de contacto.",
        method: "GET",
        sherlockMapping: "Supplier",
      },
      {
        path: "v1/suppliers/accounting",
        label: "Contabilidad Proveedores",
        description: "Datos contables de proveedores.",
        method: "GET",
      },
      {
        path: "v1/suppliers/category",
        label: "Categorías de Proveedores",
        description: "Categorías para clasificar proveedores.",
        method: "GET",
      },
      {
        path: "v1/suppliers/subcategory",
        label: "Subcategorías de Proveedores",
        description: "Subcategorías de proveedores.",
        method: "GET",
      },
    ],
  },
  {
    label: "Pedidos & Albaranes",
    color: "text-orange-500",
    endpoints: [
      {
        path: "v1/order/purchases",
        label: "Pedidos de Compra",
        description: "Órdenes de compra a proveedores.",
        method: "GET",
        requiredParams: [CENTER_PARAM, START_DATE_PARAM, END_DATE_PARAM],
      },
      {
        path: "v1/delivery/purchases",
        label: "Albaranes de Compra",
        description: "Albaranes de entrega de compras.",
        method: "GET",
        requiredParams: [CENTER_PARAM, START_DATE_PARAM, END_DATE_PARAM],
      },
      {
        path: "v1/delivery/purchases/accounting",
        label: "Contabilidad Albaranes",
        description: "Datos contables de albaranes de compra.",
        method: "GET",
        requiredParams: [CENTER_PARAM, START_DATE_PARAM, END_DATE_PARAM],
      },
      {
        path: "v1/invoices/purchases",
        label: "Facturas de Compra",
        description: "Facturas de compra recibidas.",
        method: "GET",
        requiredParams: [FROM_DATE_PARAM, TO_DATE_PARAM],
      },
      {
        path: "v1/invoices/purchases/accounting",
        label: "Facturas Compra (Contab.)",
        description: "Datos contables de facturas de compra.",
        method: "GET",
        requiredParams: [FROM_DATE_PARAM, TO_DATE_PARAM],
      },
      {
        path: "v1/transfers",
        label: "Transferencias",
        description: "Transferencias entre almacenes.",
        method: "GET",
        requiredParams: [START_DATE_PARAM, END_DATE_PARAM],
      },
      {
        path: "v1/inventories",
        label: "Inventarios",
        description: "Registros de inventario.",
        method: "GET",
        sherlockMapping: "InventoryRecord",
        requiredParams: [START_DATE_PARAM, END_DATE_PARAM],
      },
    ],
  },
  {
    label: "Cocina & Recetas",
    color: "text-emerald-500",
    endpoints: [
      {
        path: "v2/recipes",
        label: "Recetas",
        description: "Listado de recetas con ingredientes, subrecetas, costes y alérgenos.",
        method: "GET",
        sherlockMapping: "Recipe + RecipeIngredient",
      },
      {
        path: "v1/recipes/categories",
        label: "Categorías de Recetas",
        description: "Clasificación de recetas por tipo.",
        method: "GET",
      },
      {
        path: "v1/recipes/families",
        label: "Familias de Recetas",
        description: "Agrupación de recetas relacionadas.",
        method: "GET",
      },
      {
        path: "v1/subrecipes/units",
        label: "Unidades de Subrecetas",
        description: "Unidades para recetas jerárquicas (una receta como ingrediente de otra).",
        method: "GET",
      },
      {
        path: "v1/productionOrder/subrecipe",
        label: "Órdenes de Producción (Subrecetas)",
        description: "Órdenes de producción de subrecetas.",
        method: "GET",
      },
    ],
  },
  {
    label: "Ventas & POS",
    color: "text-amber-500",
    endpoints: [
      {
        path: "v1/plus",
        label: "PLUs",
        description: "Códigos PLU de punto de venta.",
        method: "GET",
        requiredParams: [PAGE_NUMBER_PARAM, PAGE_SIZE_PARAM],
      },
      {
        path: "v1/pos/loader/sales/json/realtime",
        label: "Ventas Tiempo Real",
        description: "Envío de datos de ventas en tiempo real desde el TPV.",
        method: "POST",
        bodyTemplate: JSON.stringify({
          centerId: 1,
          date: "2025-01-15",
          sales: [
            {
              pluId: 0,
              pluName: "Ejemplo",
              quantity: 1,
              totalAmount: 10.00,
              currencyCode: "EUR",
            },
          ],
        }, null, 2),
      },
      // v1/invoices/sales/accounting, v1/articles/sales, v1/articles/sales/resulting-units
      // eliminados — HTTP 403 Permission denied (sin acceso con las credenciales actuales)
    ],
  },
  {
    label: "Informes",
    color: "text-cyan-500",
    endpoints: [
      {
        path: "v1/costReals",
        label: "Coste Real",
        description: "Informe de coste real de productos consumidos.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costReals/items",
        label: "Coste Real (Items)",
        description: "Detalle de items de coste real.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costReals/categories",
        label: "Coste Real (Categorías)",
        description: "Coste real desglosado por categorías de producto.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costReals/families",
        label: "Coste Real (Familias)",
        description: "Coste real desglosado por familias de producto.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costReals/types",
        label: "Coste Real (Tipos)",
        description: "Coste real desglosado por tipos de producto.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costReals/subtypes",
        label: "Coste Real (Subtipos)",
        description: "Coste real desglosado por subtipos de producto.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costReals/subtypes/accounting",
        label: "Coste Real Subtipos (Contab.)",
        description: "Datos contables de coste real por subtipos.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costReals/category/accounting",
        label: "Coste Real Categoría (Contab.)",
        description: "Datos contables de coste real por categoría.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costTheoreticals",
        label: "Coste Teórico",
        description: "Coste esperado según recetas y ventas. Comparar con coste real para detectar mermas.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costTheoreticals/carte/items",
        label: "Coste Teórico (Carta)",
        description: "Detalle de coste teórico por artículos de carta.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/costTheoreticals/packs/items",
        label: "Coste Teórico (Packs)",
        description: "Detalle de coste teórico por packs/menús.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/stockVariations",
        label: "Variación de Stock",
        description: "Cambios en inventario e identificación de mermas.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/stockVariations/items",
        label: "Variación de Stock (Items)",
        description: "Detalle de items en variación de stock.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/stockTheoreticals",
        label: "Stock Teórico",
        description: "Inventario esperado según compras y ventas.",
        method: "GET",
        requiredParams: [
          { name: "date", label: "Fecha", type: "date" },
          CENTER_PARAM,
        ],
      },
      {
        path: "v1/priceVariation/products",
        label: "Variación Precios (Productos)",
        description: "Variación de precios de productos de compra.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/priceVariation/recipes",
        label: "Variación Precios (Recetas)",
        description: "Variación de precios de recetas.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/priceVariation/formats",
        label: "Variación Precios (Formatos)",
        description: "Variación de precios por formatos de producto.",
        method: "GET",
        requiredParams: [CENTER_PARAM],
      },
      {
        path: "v1/report/sales",
        label: "Reporte de Ventas",
        description: "Reportes detallados de ventas.",
        method: "GET",
        requiredParams: [
          { name: "reportType", label: "Tipo de Reporte", type: "text", placeholder: "Ej: summary" },
          { name: "currencyCode", label: "Moneda", type: "text", placeholder: "Ej: EUR" },
          CENTER_PARAM,
          START_DATE_PARAM,
          END_DATE_PARAM,
        ],
      },
    ],
  },
  {
    label: "Mermas",
    color: "text-red-500",
    endpoints: [
      {
        path: "v1/shrinkages/causes",
        label: "Causas de Merma",
        description: "Catálogo de causas de merma configuradas.",
        method: "GET",
      },
      {
        path: "v1/shrinkages/products",
        label: "Mermas de Productos",
        description: "Registro de mermas por producto.",
        method: "GET",
        requiredParams: [START_DATE_PARAM, END_DATE_PARAM],
      },
      {
        path: "v1/shrinkages/recipes",
        label: "Mermas de Recetas",
        description: "Registro de mermas por receta.",
        method: "GET",
        requiredParams: [START_DATE_PARAM, END_DATE_PARAM],
      },
      {
        path: "v1/shrinkages/product",
        label: "Registrar Merma (Producto)",
        description: "Registrar una merma de producto de compra.",
        method: "POST",
        bodyTemplate: JSON.stringify({
          date: "2025-01-15",
          centerId: 1,
          causeId: 1,
          productId: 0,
          quantity: 1,
          observations: "",
        }, null, 2),
      },
      {
        path: "v1/shrinkages/recipe",
        label: "Registrar Merma (Receta)",
        description: "Registrar una merma de receta.",
        method: "POST",
        bodyTemplate: JSON.stringify({
          date: "2025-01-15",
          centerId: 1,
          causeId: 1,
          recipeId: 0,
          quantity: 1,
          observations: "",
        }, null, 2),
      },
      {
        path: "v1/shrinkages/format",
        label: "Registrar Merma (Formato)",
        description: "Registrar una merma por formato de producto.",
        method: "POST",
        bodyTemplate: JSON.stringify({
          date: "2025-01-15",
          centerId: 1,
          causeId: 1,
          formatId: 0,
          quantity: 1,
          observations: "",
        }, null, 2),
      },
      {
        path: "v1/shrinkages/subrecipe",
        label: "Registrar Merma (Subreceta)",
        description: "Registrar una merma de subreceta.",
        method: "POST",
        bodyTemplate: JSON.stringify({
          date: "2025-01-15",
          centerId: 1,
          causeId: 1,
          subrecipeId: 0,
          quantity: 1,
          observations: "",
        }, null, 2),
      },
    ],
  },
  {
    label: "Organización",
    color: "text-slate-500",
    endpoints: [
      {
        path: "v1/centers",
        label: "Centros",
        description: "Centros/locales del negocio registrados en GStock.",
        method: "GET",
      },
      {
        path: "v1/centers/groups",
        label: "Grupos de Centros",
        description: "Agrupación de centros.",
        method: "GET",
      },
      {
        path: "v1/payment-methods",
        label: "Métodos de Pago",
        description: "Métodos de pago configurados.",
        method: "GET",
      },
      {
        path: "v1/imports",
        label: "Importaciones",
        description: "Historial de importaciones de datos.",
        method: "GET",
        requiredParams: [START_DATE_PARAM, END_DATE_PARAM],
      },
    ],
  },
]

// --- OAuth2 Token Cache ---

interface GstockToken {
  access_token: string
  token_type: string
  expires_in: number
  obtainedAt: number
}

export interface GstockApiResponse<T = unknown> {
  data: T[]
  page?: {
    rows: number
    pages: number
  }
}

let cachedToken: GstockToken | null = null

function isTokenValid(): boolean {
  if (!cachedToken) return false
  const elapsedSeconds = (Date.now() - cachedToken.obtainedAt) / 1000
  return elapsedSeconds < cachedToken.expires_in - 60
}

export async function getGstockToken(): Promise<string> {
  if (isTokenValid()) return cachedToken!.access_token

  const baseUrl = process.env.GSTOCK_API_URL
  const clientId = process.env.GSTOCK_CLIENT_ID
  const clientSecret = process.env.GSTOCK_CLIENT_SECRET

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("GSTOCK_API_URL, GSTOCK_CLIENT_ID and GSTOCK_CLIENT_SECRET must be set in environment variables")
  }

  const response = await fetch(`${baseUrl}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`GStock OAuth error: HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  cachedToken = { ...data, obtainedAt: Date.now() }
  return cachedToken!.access_token
}

export async function fetchGstock<T = unknown>(endpoint: string): Promise<GstockApiResponse<T>> {
  const baseUrl = process.env.GSTOCK_API_URL

  if (!baseUrl) {
    throw new Error("GSTOCK_API_URL must be set in environment variables")
  }

  const token = await getGstockToken()
  const url = `${baseUrl}/${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`GStock API HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}
