export interface GstockEndpoint {
  path: string
  label: string
  description: string
  method: "GET" | "POST"
  sherlockMapping?: string
}

export interface GstockEndpointGroup {
  label: string
  color: string
  endpoints: GstockEndpoint[]
}

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
      },
      {
        path: "v1/delivery/purchases",
        label: "Albaranes de Compra",
        description: "Albaranes de entrega de compras.",
        method: "GET",
      },
      {
        path: "v1/delivery/purchases/accounting",
        label: "Contabilidad Albaranes",
        description: "Datos contables de albaranes de compra.",
        method: "GET",
      },
      {
        path: "v1/invoices/purchases",
        label: "Facturas de Compra",
        description: "Facturas de compra recibidas.",
        method: "GET",
      },
      {
        path: "v1/transfers",
        label: "Transferencias",
        description: "Transferencias entre almacenes.",
        method: "GET",
      },
      {
        path: "v1/inventories",
        label: "Inventarios",
        description: "Registros de inventario.",
        method: "GET",
        sherlockMapping: "InventoryRecord",
      },
    ],
  },
  {
    label: "Cocina & Recetas",
    color: "text-emerald-500",
    endpoints: [
      {
        path: "v1/recipes",
        label: "Recetas",
        description: "Listado de recetas con ingredientes, subrecetas y costes.",
        method: "GET",
        sherlockMapping: "Recipe + RecipeIngredient",
      },
      {
        path: "v2/recipes",
        label: "Recetas v2",
        description: "Recetas en formato v2 con datos ampliados.",
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
        path: "v1/pos/categories",
        label: "Categorías POS",
        description: "Categorías de punto de venta para organizar productos en TPV.",
        method: "GET",
      },
      {
        path: "v1/plus",
        label: "PLUs",
        description: "Códigos PLU de punto de venta.",
        method: "GET",
      },
      {
        path: "v1/pos/loader/sales/json/realtime",
        label: "Ventas Tiempo Real",
        description: "Datos de ventas en tiempo real desde el TPV.",
        method: "POST",
      },
      {
        path: "v1/pos/loader/sales/json",
        label: "Carga de Ventas",
        description: "Carga de datos de ventas en formato JSON.",
        method: "POST",
      },
      {
        path: "v1/invoices/sales/accounting",
        label: "Facturas de Venta",
        description: "Datos contables de facturas de venta.",
        method: "GET",
      },
      {
        path: "v1/articles/sales",
        label: "Artículos de Venta",
        description: "Listado de artículos de venta.",
        method: "GET",
      },
      {
        path: "v1/articles/sales/resulting-units",
        label: "Unidades Resultantes",
        description: "Unidades resultantes de artículos de venta.",
        method: "GET",
      },
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
      },
      {
        path: "v1/costReals/items",
        label: "Coste Real (Items)",
        description: "Detalle de items de coste real.",
        method: "GET",
      },
      {
        path: "v1/costTheoreticals",
        label: "Coste Teórico",
        description: "Coste esperado según recetas y ventas. Comparar con coste real para detectar mermas.",
        method: "GET",
      },
      {
        path: "v1/stockVariations",
        label: "Variación de Stock",
        description: "Cambios en inventario e identificación de mermas.",
        method: "GET",
      },
      {
        path: "v1/stockVariations/items",
        label: "Variación de Stock (Items)",
        description: "Detalle de items en variación de stock.",
        method: "GET",
      },
      {
        path: "v1/stockTheoreticals",
        label: "Stock Teórico",
        description: "Inventario esperado según compras y ventas.",
        method: "GET",
      },
      {
        path: "v1/priceVariation/products",
        label: "Variación Precios (Productos)",
        description: "Variación de precios de productos de compra.",
        method: "GET",
      },
      {
        path: "v1/priceVariation/recipes",
        label: "Variación Precios (Recetas)",
        description: "Variación de precios de recetas.",
        method: "GET",
      },
      {
        path: "v1/report/sales",
        label: "Reporte de Ventas",
        description: "Reportes detallados de ventas.",
        method: "GET",
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
      },
      {
        path: "v1/shrinkages/recipes",
        label: "Mermas de Recetas",
        description: "Registro de mermas por receta.",
        method: "GET",
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
