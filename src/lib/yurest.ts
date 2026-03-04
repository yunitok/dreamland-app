export interface YurestEndpoint {
  path: string
  label: string
  description: string
  method: "GET" | "POST"
  sherlockMapping?: string
}

export interface YurestEndpointGroup {
  label: string
  color: string
  endpoints: YurestEndpoint[]
}

export const YUREST_ENDPOINT_GROUPS: YurestEndpointGroup[] = [
  {
    label: "Compras & Productos",
    color: "text-blue-500",
    endpoints: [
      {
        path: "products",
        label: "Productos",
        description: "Listado completo de productos/ingredientes con precios, IVA, unidades y proveedores.",
        method: "GET",
        sherlockMapping: "Ingredient",
      },
      {
        path: "product-data-sheets",
        label: "Fichas de Producto",
        description: "Fichas técnicas detalladas con información nutricional y trazabilidad.",
        method: "GET",
        sherlockMapping: "Ingredient (campos extendidos)",
      },
      {
        path: "unities",
        label: "Unidades de Medida",
        description: "Unidades disponibles en el sistema (Kg, L, Unidad, etc.).",
        method: "GET",
        sherlockMapping: "MeasureUnit",
      },
      {
        path: "family_buys",
        label: "Familias de Producto",
        description: "Categorías/familias para agrupar productos.",
        method: "GET",
        sherlockMapping: "Category",
      },
      {
        path: "providers",
        label: "Proveedores",
        description: "Listado de proveedores con datos de contacto.",
        method: "GET",
        sherlockMapping: "Supplier",
      },
      {
        path: "provider_products",
        label: "Productos por Proveedor",
        description: "Relación entre proveedores y sus productos ofertados.",
        method: "GET",
      },
    ],
  },
  {
    label: "Almacén & Stock",
    color: "text-purple-500",
    endpoints: [
      {
        path: "stock",
        label: "Stock Actual",
        description: "Niveles de stock en tiempo real por producto.",
        method: "GET",
        sherlockMapping: "Ingredient.currentStock",
      },
      {
        path: "stock_details",
        label: "Movimientos de Stock",
        description: "Historial detallado de entradas, salidas y ajustes de inventario.",
        method: "GET",
        sherlockMapping: "InventoryRecord",
      },
      {
        path: "storage_location",
        label: "Ubicaciones de Almacén",
        description: "Localizaciones físicas de almacenamiento (cámaras, almacén seco, etc.).",
        method: "GET",
      },
      {
        path: "stores/warehouse-locations/inventories",
        label: "Inventarios",
        description: "Registros de conteo de inventario por ubicación.",
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
        path: "recipes",
        label: "Recetas",
        description: "Recetario completo con ingredientes, pasos, tiempos y costes.",
        method: "GET",
        sherlockMapping: "Recipe + RecipeIngredient",
      },
      {
        path: "menus",
        label: "Menús",
        description: "Menús del restaurante con relación a recetas.",
        method: "GET",
      },
    ],
  },
  {
    label: "Ventas",
    color: "text-amber-500",
    endpoints: [
      {
        path: "sales",
        label: "Ventas",
        description: "Registro de transacciones de venta.",
        method: "GET",
      },
      {
        path: "sales_lines",
        label: "Líneas de Venta",
        description: "Detalle de productos vendidos por transacción.",
        method: "GET",
      },
    ],
  },
  {
    label: "Tareas & Auditorías",
    color: "text-red-500",
    endpoints: [
      {
        path: "checklists",
        label: "Checklists",
        description: "Listas de verificación y tareas programadas.",
        method: "GET",
      },
      {
        path: "audits",
        label: "Auditorías",
        description: "Registros de auditoría del sistema.",
        method: "GET",
      },
      {
        path: "apccs",
        label: "APPCC",
        description: "Registros de cumplimiento de seguridad alimentaria.",
        method: "GET",
      },
    ],
  },
  {
    label: "Informes",
    color: "text-cyan-500",
    endpoints: [
      {
        path: "ebita",
        label: "EBITDA",
        description: "Resumen financiero con notas de entrega, gastos y ventas.",
        method: "GET",
      },
      {
        path: "delivery_note",
        label: "Albaranes",
        description: "Listado de albaranes de entrega.",
        method: "GET",
      },
      {
        path: "bill",
        label: "Facturas",
        description: "Listado de facturas recibidas.",
        method: "GET",
      },
    ],
  },
  {
    label: "Sistema",
    color: "text-slate-500",
    endpoints: [
      {
        path: "stores",
        label: "Tiendas/Locales",
        description: "Locales del negocio registrados en Yurest.",
        method: "GET",
      },
      {
        path: "users",
        label: "Usuarios",
        description: "Usuarios del sistema con roles asignados.",
        method: "GET",
      },
      {
        path: "roles",
        label: "Roles",
        description: "Niveles de permisos disponibles.",
        method: "GET",
      },
    ],
  },
]

export interface YurestApiResponse<T = unknown> {
  status: 0 | 1 | "success"
  message: string
  data: T[] | T
}

// ─── Tipos para receta de listado (/recipes) ─────────────────────

export interface YurestRecipeListItem {
  id: number
  name: string
  description: string | null
  servings: number
  servingPrice: number
  times: { hours: number; minutes: number; seconds: number; timeUnix: number }
  media: { photo: string | null; video: string | null; youtube: string | null }
  nutritional_info: Record<string, number>
  usage_instructions: string | null
  storage_instructions: string | null
  label_text: string | null
  is_active: boolean
}

// ─── Tipos para receta de detalle (/recipes/{id}) ────────────────

export interface YurestRecipeStep {
  id: number
  recipe_id: number
  order: number
  title: string
  description: string
  times: { hours: number | null; minutes: number | null; seconds: number | null; time_unix: number | null }
  media: { photo: string | null; video: string | null }
  needs_temperature: boolean
  products: unknown[]
}

export interface YurestRecipeIngredient {
  id: number
  recipe_id: number
  product_id: number
  product_name: string
  amount: number
  unit: { id: number; symbol: string }
  cost: number
  order: number
  description: string | null
  label_text: string | null
}

export interface YurestRecipeDetail extends Omit<YurestRecipeListItem, "media"> {
  media: { photo: string | null; video: string | null; youtube: string | null }
  ingredients: YurestRecipeIngredient[]
  steps: YurestRecipeStep[]
  costs: { store_id: number | null; store_name: string; cost: number }[]
  results: { id: number; recipe_id: number; product_id: number; product_name: string; amount: number; unit: { id: number; symbol: string }; shelf_life: { days: number; seconds: number } }[]
}

// ─── Funciones de fetch ──────────────────────────────────────────

function getYurestConfig() {
  const baseUrl = process.env.YUREST_API_URL
  const token = process.env.YUREST_TOKEN

  if (!baseUrl || !token) {
    throw new Error("YUREST_API_URL and YUREST_TOKEN must be set in environment variables")
  }

  return { baseUrl, token }
}

export async function fetchYurest<T = unknown>(endpoint: string): Promise<YurestApiResponse<T>> {
  const { baseUrl, token } = getYurestConfig()
  const url = `${baseUrl}/${token}/${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Yurest API HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/** Fetch detalle individual de una receta (incluye steps, ingredients, costs, results) */
export async function fetchYurestRecipeDetail(id: number): Promise<YurestRecipeDetail> {
  const { baseUrl, token } = getYurestConfig()
  const url = `${baseUrl}/${token}/recipes/${id}`

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Yurest API HTTP ${response.status} for recipe ${id}: ${response.statusText}`)
  }

  const json = await response.json()
  return json.data as YurestRecipeDetail
}
